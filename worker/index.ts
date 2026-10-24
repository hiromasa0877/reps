import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context } from "hono";
import { CATALOG, PART_IDS, findExercise, type Part } from "../shared/catalog";

type Env = {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  DEV_LOGIN?: string;
};
type Vars = { userId: string };
type App = { Bindings: Env; Variables: Vars };

const SESSION_COOKIE = "reps_session";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days (seconds)
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const STATUSES = ["todo", "doing", "done"] as const;
type Status = (typeof STATUSES)[number];

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const app = new Hono<App>().basePath("/api");

// ---------- helpers ----------

const now = () => Date.now();
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 4) / 4)) : fallback;
};
const cleanText = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);
}

async function startSession(c: Context<App>, userId: string) {
  const token = randomToken();
  await c.env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, now() + SESSION_TTL * 1000)
    .run();
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "Lax", path: "/", maxAge: SESSION_TTL });
}

async function upsertUser(db: D1Database, u: { id: string; email: string; name: string; picture: string }) {
  await db
    .prepare(
      `INSERT INTO users (id, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture`,
    )
    .bind(u.id, u.email, u.name, u.picture, now())
    .run();
}

// ---------- CSRF: mutating requests must be same-origin JSON ----------

app.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin) return c.json({ error: "bad_origin" }, 403);
    if (c.req.method !== "DELETE" && !c.req.header("content-type")?.includes("application/json")) {
      return c.json({ error: "json_required" }, 415);
    }
  }
  await next();
});

// ---------- public ----------

app.get("/config", (c) =>
  c.json({ googleClientId: c.env.GOOGLE_CLIENT_ID || null, devLogin: c.env.DEV_LOGIN === "true" }),
);

app.post("/auth/google", async (c) => {
  const { credential } = await c.req.json<{ credential?: string }>();
  if (!credential || !c.env.GOOGLE_CLIENT_ID) return c.json({ error: "invalid_request" }, 400);
  try {
    const { payload } = await jwtVerify(credential, googleJwks, {
      audience: c.env.GOOGLE_CLIENT_ID,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    if (!payload.sub || !payload.email || payload.email_verified === false) throw new Error("unverified");
    await upsertUser(c.env.DB, {
      id: `google:${payload.sub}`,
      email: String(payload.email),
      name: String(payload.name ?? ""),
      picture: String(payload.picture ?? ""),
    });
    await startSession(c, `google:${payload.sub}`);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
});

// Local development only: enabled via DEV_LOGIN=true in .dev.vars (never set in production).
app.post("/auth/dev", async (c) => {
  await c.req.text(); // drain the body so the keep-alive connection stays usable
  if (c.env.DEV_LOGIN !== "true") return c.json({ error: "not_found" }, 404);
  await upsertUser(c.env.DB, { id: "dev:local", email: "dev@localhost", name: "Dev User", picture: "" });
  await startSession(c, "dev:local");
  return c.json({ ok: true });
});

app.post("/auth/logout", async (c) => {
  await c.req.text();
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// ---------- authenticated ----------

app.use("*", async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < now()) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", row.user_id);
  await next();
});

app.get("/me", async (c) => {
  const user = await c.env.DB.prepare("SELECT id, email, name, picture FROM users WHERE id = ?")
    .bind(c.get("userId"))
    .first();
  return user ? c.json(user) : c.json({ error: "unauthorized" }, 401);
});

const TASK_COLS = "id, date, name, part, sets, reps, weight, set_list, volume, done_sets, note, status, position, completed_at";

// ---------- per-set detail ----------

type SetRow = { weight: number; reps: number; note: string };

/** Clean a client-sent set list; falls back to identical sets built from sets/reps/weight. */
function normalizeSets(input: unknown, fallback: { sets?: unknown; reps?: unknown; weight?: unknown }): SetRow[] {
  const list = Array.isArray(input)
    ? input.slice(0, 20).map((r: any) => ({
        weight: clampNum(r?.weight, 0, 999, 0),
        reps: clampInt(r?.reps, 1, 200, 10),
        note: cleanText(r?.note, 60),
      }))
    : [];
  if (list.length) return list;
  const n = clampInt(fallback.sets, 1, 20, 3);
  const row = { weight: clampNum(fallback.weight, 0, 999, 0), reps: clampInt(fallback.reps, 1, 200, 10), note: "" };
  return Array.from({ length: n }, () => ({ ...row }));
}

/** Summary columns kept for stats/AI: set count, heaviest weight with its reps, and total load. */
function summarize(list: SetRow[]) {
  const top = list.reduce((a, r) => (r.weight > a.weight ? r : a), list[0]);
  return { sets: list.length, weight: top.weight, reps: top.reps, volume: list.reduce((a, r) => a + r.weight * r.reps, 0) };
}

/** Parse a stored row's set_list, expanding legacy '[]' rows from their summary columns. */
function readSets(row: { set_list?: unknown; sets?: unknown; reps?: unknown; weight?: unknown }): SetRow[] {
  let list: unknown = [];
  try {
    list = typeof row.set_list === "string" ? JSON.parse(row.set_list) : row.set_list;
  } catch {
    /* fall through to summary columns */
  }
  return normalizeSets(list, row);
}

const partOf = (input: unknown, name: string): Part | "" =>
  PART_IDS.includes(input as Part) ? (input as Part) : (findExercise(name)?.part ?? "");

app.get("/tasks", async (c) => {
  const date = c.req.query("date");
  if (!isDate(date)) return c.json({ error: "bad_date" }, 400);
  // "prev" = the most recent completed set of the same exercise before this day.
  const { results } = await c.env.DB.prepare(
    `SELECT ${TASK_COLS.split(", ").map((col) => "t." + col).join(", ")},
       (SELECT json_object('date', p.date, 'sets', p.sets, 'reps', p.reps, 'weight', p.weight, 'set_list', json(p.set_list))
          FROM tasks p WHERE p.user_id = t.user_id AND p.name = t.name AND p.status = 'done' AND p.date < t.date
          ORDER BY p.date DESC, p.completed_at DESC LIMIT 1) AS prev
     FROM tasks t WHERE t.user_id = ? AND t.date = ? ORDER BY t.position, t.created_at`,
  )
    .bind(c.get("userId"), date)
    .all<Record<string, unknown>>();
  return c.json(
    results.map((r: any) => {
      const prev = r.prev ? JSON.parse(r.prev) : null;
      return { ...r, set_list: readSets(r), prev: prev && { ...prev, set_list: readSets(prev) } };
    }),
  );
});

type TaskInput = { name?: unknown; part?: unknown; sets?: unknown; reps?: unknown; weight?: unknown; note?: unknown; set_list?: unknown };

app.post("/tasks", async (c) => {
  const body = await c.req.json<{ date?: string; items?: TaskInput[] } & TaskInput>();
  if (!isDate(body.date)) return c.json({ error: "bad_date" }, 400);
  const items = (Array.isArray(body.items) ? body.items : [body]).slice(0, 30);
  const userId = c.get("userId");
  const maxPos = await c.env.DB.prepare("SELECT COALESCE(MAX(position), 0) AS p FROM tasks WHERE user_id = ? AND date = ?")
    .bind(userId, body.date)
    .first<{ p: number }>();
  let pos = maxPos?.p ?? 0;
  const t = now();
  // Registering an exercise means it was done: entries are saved as completed right away.
  const created = items
    .map((it) => {
      const set_list = normalizeSets(it.set_list, it);
      const sum = summarize(set_list);
      return {
        id: crypto.randomUUID(),
        date: body.date!,
        name: cleanText(it.name, 60),
        part: partOf(it.part, cleanText(it.name, 60)),
        ...sum,
        set_list,
        done_sets: sum.sets,
        note: cleanText(it.note, 200),
        status: "done" as Status,
        position: ++pos,
        completed_at: t,
      };
    })
    .filter((it) => it.name);
  if (!created.length) return c.json({ error: "name_required" }, 400);
  await c.env.DB.batch(
    created.map((it) =>
      c.env.DB.prepare(
        `INSERT INTO tasks (id, user_id, date, name, part, sets, reps, weight, set_list, volume, done_sets, note, status, position,
           created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?)`,
      ).bind(it.id, userId, it.date, it.name, it.part, it.sets, it.reps, it.weight, JSON.stringify(it.set_list), it.volume, it.sets,
        it.note, it.position, t, t, t),
    ),
  );
  return c.json(created.map((it) => ({ ...it, prev: null })), 201);
});

app.patch("/tasks/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const cur = await c.env.DB.prepare(`SELECT ${TASK_COLS} FROM tasks WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first<Record<string, any>>();
  if (!cur) return c.json({ error: "not_found" }, 404);
  const b = await c.req.json<Record<string, unknown>>();
  const next = { ...cur };
  if ("name" in b) next.name = cleanText(b.name, 60) || cur.name;
  if ("name" in b || "part" in b) next.part = partOf(b.part ?? cur.part, next.name);
  if ("set_list" in b || "sets" in b || "reps" in b || "weight" in b) {
    const list = "set_list" in b ? normalizeSets(b.set_list, cur) : normalizeSets(null, { ...cur, ...b });
    Object.assign(next, summarize(list), { set_list: list, done_sets: list.length });
  } else {
    next.set_list = readSets(cur);
  }
  if ("note" in b) next.note = cleanText(b.note, 200);
  if ("position" in b) next.position = Number(b.position) || cur.position;
  if ("done_sets" in b) next.done_sets = clampInt(b.done_sets, 0, next.sets, cur.done_sets);
  if ("status" in b && STATUSES.includes(b.status as Status)) next.status = b.status;
  next.done_sets = Math.min(next.done_sets, next.sets);
  if (next.status === "done" && cur.status !== "done") next.done_sets = next.sets;
  if (next.status === "todo" && cur.status !== "todo") next.done_sets = 0;
  if (next.status === "doing" && next.done_sets >= next.sets) next.done_sets = Math.max(0, next.sets - 1);
  next.completed_at = next.status === "done" ? (cur.completed_at ?? now()) : null;
  await c.env.DB.prepare(
    `UPDATE tasks SET name = ?, part = ?, sets = ?, reps = ?, weight = ?, set_list = ?, volume = ?, note = ?, position = ?,
       done_sets = ?, status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
  )
    .bind(next.name, next.part, next.sets, next.reps, next.weight, JSON.stringify(next.set_list), next.volume, next.note,
      next.position, next.done_sets, next.status,
      next.completed_at, now(), id, userId)
    .run();
  return c.json(next);
});

app.delete("/tasks/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").bind(c.req.param("id"), c.get("userId")).run();
  return c.json({ ok: true });
});

// Per-day totals for the date strip and stats screen.
app.get("/summary", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!isDate(from) || !isDate(to)) return c.json({ error: "bad_date" }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT date, COUNT(*) AS total, SUM(status = 'done') AS done,
       SUM(CASE WHEN status = 'done' THEN volume ELSE 0 END) AS volume,
       GROUP_CONCAT(DISTINCT CASE WHEN status = 'done' AND part != '' THEN part END) AS parts,
       GROUP_CONCAT(DISTINCT CASE WHEN status != 'done' AND part != '' THEN part END) AS planned
     FROM tasks WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
  )
    .bind(c.get("userId"), from, to)
    .all<{ parts: string | null; planned: string | null }>();
  // parts = body parts trained that day, planned = parts on the menu but not finished yet.
  const split = (v: string | null) => (v ? v.split(",") : []);
  return c.json(results.map((r) => ({ ...r, parts: split(r.parts), planned: split(r.planned) })));
});

// Latest completed record per exercise (by training date), used to prefill new entries.
app.get("/exercises", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT name, part, sets, reps, weight, set_list, date, completed_at FROM (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY name ORDER BY date DESC, completed_at DESC) AS rn
       FROM tasks WHERE user_id = ? AND status = 'done')
     WHERE rn = 1 ORDER BY date DESC, completed_at DESC LIMIT 300`,
  )
    .bind(c.get("userId"))
    .all<any>();
  return c.json(results.map((r) => ({ ...r, set_list: readSets(r) })));
});

// Recent completed history of one exercise, for the edit sheet.
app.get("/history", async (c) => {
  const name = cleanText(c.req.query("name"), 60);
  const { results } = await c.env.DB.prepare(
    `SELECT date, sets, reps, weight, set_list FROM tasks WHERE user_id = ? AND name = ? AND status = 'done'
     ORDER BY date DESC, completed_at DESC LIMIT 6`,
  )
    .bind(c.get("userId"), name)
    .all<any>();
  return c.json(results.map((r) => ({ ...r, set_list: readSets(r) })));
});

// Completed exercises per body part.
app.get("/parts", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!isDate(from) || !isDate(to)) return c.json({ error: "bad_date" }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT part,
       SUM(date BETWEEN ?2 AND ?3) AS done,
       COUNT(DISTINCT CASE WHEN date BETWEEN ?2 AND ?3 THEN date END) AS days,
       MAX(date) AS last,
       GROUP_CONCAT(DISTINCT CASE WHEN date BETWEEN ?2 AND ?3 THEN name END) AS names
     FROM tasks WHERE user_id = ?1 AND status = 'done' AND part != '' AND date <= ?3
     GROUP BY part`,
  )
    .bind(c.get("userId"), from, to)
    .all<{ names: string | null }>();
  // last = most recent training day for the part (any time up to `to`), for "n日前" recency.
  return c.json(results.map((r) => ({ ...r, names: r.names ? r.names.split(",") : [] })));
});

// ---------- Workers AI: generate a workout menu ----------

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          part: { type: "string", enum: PART_IDS },
          sets: { type: "integer" },
          reps: { type: "integer" },
          weight: { type: "number" },
          note: { type: "string" },
        },
        required: ["name", "part", "sets", "reps", "weight", "note"],
      },
    },
  },
  required: ["items"],
};

app.post("/ai/plan", async (c) => {
  const { prompt, parts } = await c.req.json<{ prompt?: string; parts?: string[] }>();
  const focus = (Array.isArray(parts) ? parts : []).filter((p): p is Part => PART_IDS.includes(p as Part));
  const request = [cleanText(prompt, 200), focus.length ? `対象部位: ${focus.join(", ")}` : ""].filter(Boolean).join("\n");
  if (!request) return c.json({ error: "prompt_required" }, 400);

  const { results: history } = await c.env.DB.prepare(
    `SELECT date, name, sets, reps, weight FROM tasks WHERE user_id = ? AND status = 'done'
     ORDER BY completed_at DESC LIMIT 20`,
  )
    .bind(c.get("userId"))
    .all<{ date: string; name: string; sets: number; reps: number; weight: number }>();
  const historyText = history.length
    ? history.map((h) => `${h.date} ${h.name} ${h.weight}kg×${h.reps}回×${h.sets}セット`).join("\n")
    : "なし";

  const system = [
    "あなたは経験豊富なパーソナルトレーナーです。ユーザーの要望から今日の筋トレメニューを作成します。",
    "出力は必ず JSON のみ。種目名は可能な限り次のリストから選ぶ(リストに無い場合のみ一般的な日本語名):",
    CATALOG.map((e) => `${e.name}(${e.part})`).join(", "),
    "part は chest/back/legs/shoulders/arms/abs のいずれか。",
    "3〜7種目。weight はkg単位(自重種目は0)。過去の記録があれば、それを参考に無理のない漸進的な重量にする。",
    "note は20文字以内の日本語のフォームのコツ。",
  ].join("\n");

  try {
    const res = (await c.env.AI.run(AI_MODEL as any, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: `要望: ${request}\n\n直近の記録:\n${historyText}` },
      ],
      response_format: { type: "json_schema", json_schema: PLAN_SCHEMA },
      max_tokens: 1200,
      temperature: 0.4,
    } as any)) as { response?: unknown };
    const raw = res.response;
    const parsed = typeof raw === "string" ? JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) : raw;
    const items = ((parsed as any)?.items ?? [])
      .map((it: TaskInput) => ({
        name: cleanText(it.name, 60),
        part: partOf(it.part, cleanText(it.name, 60)),
        sets: clampInt(it.sets, 1, 20, 3),
        reps: clampInt(it.reps, 1, 200, 10),
        weight: clampNum(it.weight, 0, 999, 0),
        // Curated cue for known exercises reads better than the model's short note.
        note: findExercise(cleanText(it.name, 60))?.tips[0] ?? cleanText(it.note, 60),
      }))
      .filter((it: { name: string }) => it.name)
      .slice(0, 10);
    if (!items.length) throw new Error("empty");
    return c.json({ items });
  } catch (e) {
    console.error("ai_plan_failed", e);
    return c.json({ error: "ai_failed" }, 502);
  }
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
