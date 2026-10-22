import type { Part } from "../shared/catalog";

export type Status = "todo" | "doing" | "done";
export type WorkRecord = { date: string; sets: number; reps: number; weight: number };

export type Task = {
  id: string;
  date: string;
  name: string;
  part: Part | "";
  sets: number;
  reps: number;
  weight: number;
  done_sets: number;
  prev: WorkRecord | null;
  note: string;
  status: Status;
  position: number;
  completed_at: number | null;
};

export type TaskDraft = { name: string; part?: Part | ""; sets: number; reps: number; weight: number; note?: string };
export type LastRecord = WorkRecord & { name: string; part: Part | "" };
export type User = { id: string; email: string; name: string; picture: string };
export type Config = { googleClientId: string | null; devLogin: boolean };
export type DaySummary = { date: string; total: number; done: number; volume: number };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: init.body ? { "content-type": "application/json", ...init.headers } : init.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "error");
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  config: () => request<Config>("/config"),
  me: () => request<User>("/me"),
  loginGoogle: (credential: string) => request("/auth/google", json("POST", { credential })),
  loginDev: () => request("/auth/dev", json("POST", {})),
  logout: () => request("/auth/logout", json("POST", {})),
  tasks: (date: string) => request<Task[]>(`/tasks?date=${date}`),
  createTasks: (date: string, items: TaskDraft[]) => request<Task[]>("/tasks", json("POST", { date, items })),
  updateTask: (id: string, patch: Partial<Task>) => request<Task>(`/tasks/${id}`, json("PATCH", patch)),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),
  summary: (from: string, to: string) => request<DaySummary[]>(`/summary?from=${from}&to=${to}`),
  exercises: () => request<LastRecord[]>("/exercises"),
  history: (name: string) => request<WorkRecord[]>(`/history?name=${encodeURIComponent(name)}`),
  parts: (from: string, to: string) => request<{ part: Part; done: number }[]>(`/parts?from=${from}&to=${to}`),
  aiPlan: (prompt: string, parts: Part[]) => request<{ items: TaskDraft[] }>("/ai/plan", json("POST", { prompt, parts })),
};

// ---------- dates (local time, YYYY-MM-DD) ----------

export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const todayKey = () => toKey(new Date());
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export const haptic = (pattern: number | number[] = 8) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};

export const fmtSet = (r: { weight: number; reps: number; sets: number }) =>
  `${r.weight > 0 ? `${r.weight}kg` : "自重"} × ${r.reps}回 × ${r.sets}セット`;
export const fmtDate = (k: string) => {
  const d = fromKey(k);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
