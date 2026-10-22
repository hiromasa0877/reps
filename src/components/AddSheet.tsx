import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, History, Pencil, Plus, Sparkles } from "lucide-react";
import { CATALOG, PARTS, findExercise, type Part } from "../../shared/catalog";
import { api, fmtDate, fmtSet, haptic, type LastRecord, type TaskDraft } from "../api";
import { useTasks } from "../useTasks";
import { FormGuide } from "./FormDiagram";
import { Sheet } from "./Sheet";
import { AiSkeleton } from "./Skeleton";
import { Stepper } from "./Stepper";
import { useToast } from "./Toast";

const AI_EXAMPLES = ["45分 中級", "30分 初心者", "高重量・低回数", "自宅・器具なし", "軽めに"];

type Mode = "manual" | "ai";
type PartTab = Part | "recent";

export function AddSheet({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("manual");
  return (
    <Sheet open={open} onClose={onClose} label="種目を追加" title="種目を追加">
      <div className="segmented" role="tablist">
        {(["manual", "ai"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
            {mode === m && <motion.div layoutId="seg-thumb" className="thumb" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            {m === "manual" ? <Pencil size={15} /> : <Sparkles size={15} />}
            <span>{m === "manual" ? "部位から選ぶ" : "AI で作成"}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "ai" ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "ai" ? -24 : 24 }}
          transition={{ duration: 0.18 }}
        >
          {mode === "manual" ? <ManualForm date={date} onDone={onClose} /> : <AiForm date={date} onDone={onClose} />}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function PartTabs<T extends string>({
  value,
  onChange,
  extra,
  multi,
}: {
  value: T | T[];
  onChange: (v: T) => void;
  extra?: { id: T; label: React.ReactNode }[];
  multi?: boolean;
}) {
  const tabs = [...(extra ?? []), ...PARTS.map((p) => ({ id: p.id as unknown as T, label: p.label, color: p.color }))];
  const isOn = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div className="part-tabs" role="tablist" aria-label="部位">
      {tabs.map((t) => {
        const color = "color" in t ? (t.color as string) : "#0b0d12";
        const on = isOn(t.id);
        return (
          <motion.button
            key={t.id}
            role="tab"
            aria-selected={on}
            className={`part-tab ${on ? "on" : ""}`}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              haptic(4);
              onChange(t.id);
            }}
          >
            {on &&
              (multi ? (
                <motion.div className="bg" style={{ background: color }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} />
              ) : (
                <motion.div layoutId="part-bg" className="bg" style={{ background: color }} transition={{ type: "spring", stiffness: 500, damping: 38 }} />
              ))}
            {"color" in t && <i style={{ background: color }} />}
            <span>{t.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ManualForm({ date, onDone }: { date: string; onDone: () => void }) {
  const { create } = useTasks(date);
  const toast = useToast();
  const recent = useQuery({ queryKey: ["exercises"], queryFn: api.exercises });
  const last = useMemo(() => new Map((recent.data ?? []).map((r) => [r.name, r])), [recent.data]);
  const [tab, setTab] = useState<PartTab>("chest");
  const [tabTouched, setTabTouched] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [custom, setCustom] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Open on "recent" once we know the user has history (unless they already picked a tab).
  useEffect(() => {
    if (!tabTouched && recent.data?.length) setTab("recent");
  }, [recent.data, tabTouched]);

  const list: { name: string; part: Part | ""; rec?: LastRecord }[] =
    tab === "recent"
      ? (recent.data ?? []).slice(0, 20).map((r) => ({ name: r.name, part: r.part || findExercise(r.name)?.part || "", rec: r }))
      : [
          ...CATALOG.filter((e) => e.part === tab).map((e) => ({ name: e.name, part: e.part, rec: last.get(e.name) })),
          ...(recent.data ?? [])
            .filter((r) => r.part === tab && !CATALOG.some((e) => e.name === r.name))
            .map((r) => ({ name: r.name, part: r.part, rec: r })),
        ];

  const pick = (name: string, part: Part | "") => {
    haptic(6);
    const rec = last.get(name);
    const ex = findExercise(name);
    const base = rec ?? ex ?? { sets: 3, reps: 10, weight: 0 };
    setDraft({ name, part, sets: base.sets, reps: base.reps, weight: base.weight });
    setCustom(false);
  };

  const selected = draft ? last.get(draft.name) : undefined;
  const exercise = draft ? findExercise(draft.name) : undefined;

  const submit = async (keepOpen: boolean) => {
    if (!draft?.name.trim()) return;
    await create.mutateAsync([draft]);
    haptic(10);
    toast(`${draft.name} を追加`);
    if (keepOpen) {
      setDraft(null);
      setShowForm(false);
    } else onDone();
  };

  return (
    <div>
      <PartTabs<PartTab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setTabTouched(true);
        }}
        extra={recent.data?.length ? [{ id: "recent", label: <><History size={14} style={{ verticalAlign: -2 }} /> 前回</> }] : []}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="ex-grid"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {list.map((it, i) => {
            const on = draft?.name === it.name;
            const color = PARTS.find((p) => p.id === it.part)?.color ?? "#0b0d12";
            return (
              <motion.button
                key={it.name}
                type="button"
                className={`ex-tile ${on ? "on" : ""}`}
                style={{ ["--sel" as string]: color }}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.025 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => pick(it.name, it.part)}
                aria-pressed={on}
                data-testid="ex-tile"
              >
                <span className="n">{it.name}</span>
                <span className={`l ${it.rec ? "has" : ""}`}>
                  {it.rec ? `前回 ${it.rec.weight > 0 ? `${it.rec.weight}kg` : "自重"}×${it.rec.reps}` : "記録なし"}
                </span>
                <AnimatePresence>
                  {on && (
                    <motion.span className="tick" style={{ background: color }} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check size={12} strokeWidth={3.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {!custom ? (
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setCustom(true);
            setDraft({ name: "", part: tab === "recent" ? "" : tab, sets: 3, reps: 10, weight: 0 });
          }}
        >
          <Plus size={15} /> リストにない種目を入力
        </button>
      ) : (
        <motion.input
          className="field"
          style={{ marginTop: 12 }}
          placeholder="種目名"
          aria-label="種目名"
          autoFocus
          maxLength={60}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 52 }}
          value={draft?.name ?? ""}
          onChange={(e) => {
            const name = e.target.value;
            const rec = last.get(name.trim());
            setDraft((d) => ({ ...(d ?? { sets: 3, reps: 10, weight: 0 }), ...(rec ? { sets: rec.sets, reps: rec.reps, weight: rec.weight } : {}), name }));
          }}
        />
      )}

      <AnimatePresence initial={false}>
        {draft && (draft.name || custom) && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            {selected && (
              <motion.div className="last-rec" initial={{ scale: 0.96 }} animate={{ scale: 1 }} data-testid="last-record">
                <History size={15} />
                <span className="grow">
                  前回 {fmtDate(selected.date)}：{fmtSet(selected)}
                </span>
                <button type="button" onClick={() => setDraft({ ...draft, sets: selected.sets, reps: selected.reps, weight: selected.weight })}>
                  同じ
                </button>
                {selected.weight > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, sets: selected.sets, reps: selected.reps, weight: selected.weight + 2.5 })}
                  >
                    +2.5kg
                  </button>
                )}
              </motion.div>
            )}
            <div className="label">内容</div>
            <div className="steppers">
              <Stepper label="重量" unit="kg" value={draft.weight} step={2.5} min={0} max={999} onChange={(weight) => setDraft({ ...draft, weight })} />
              <Stepper label="回数" value={draft.reps} step={1} min={1} max={200} onChange={(reps) => setDraft({ ...draft, reps })} />
              <Stepper label="セット" value={draft.sets} step={1} min={1} max={20} onChange={(sets) => setDraft({ ...draft, sets })} />
            </div>

            {exercise && (
              <button type="button" className="link-btn" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm}>
                <BookOpen size={15} /> {showForm ? "フォームを閉じる" : "正しいフォームを見る"}
              </button>
            )}
            <AnimatePresence initial={false}>
              {exercise && showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                  <FormGuide exercise={exercise} compact />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button className="primary" type="button" onClick={() => submit(false)} disabled={!draft.name.trim() || create.isPending} whileTap={{ scale: 0.97 }}>
              <Check size={18} strokeWidth={3} /> 追加
            </motion.button>
            <motion.button className="secondary" type="button" disabled={!draft.name.trim() || create.isPending} onClick={() => submit(true)} whileTap={{ scale: 0.97 }}>
              <Plus size={18} strokeWidth={3} /> 追加して続ける
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AiForm({ date, onDone }: { date: string; onDone: () => void }) {
  const { create } = useTasks(date);
  const toast = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<TaskDraft[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setPicked(new Set(items?.map((_, i) => i))), [items]);

  const canGenerate = (prompt.trim() || parts.length) && !loading;
  const generate = async (text = prompt) => {
    if (!text.trim() && !parts.length) return;
    setPrompt(text);
    setLoading(true);
    setError("");
    setItems(null);
    try {
      const res = await api.aiPlan(text, parts);
      haptic([8, 30, 8]);
      setItems(res.items);
    } catch {
      setError("生成できませんでした。もう一度お試しください");
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    const chosen = items!.filter((_, i) => picked.has(i));
    await create.mutateAsync(chosen);
    haptic(10);
    toast(`${chosen.length}種目を追加`);
    onDone();
  };

  return (
    <div>
      <PartTabs<Part> multi value={parts} onChange={(p) => setParts((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))} />
      <textarea
        className="field"
        placeholder="例: 45分 中級 / 肩が痛いので軽めに"
        aria-label="AIへの要望"
        value={prompt}
        maxLength={200}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="chips">
        {AI_EXAMPLES.map((ex) => (
          <motion.button key={ex} type="button" className="chip-btn" whileTap={{ scale: 0.92 }} onClick={() => setPrompt(ex)} disabled={loading}>
            {ex}
          </motion.button>
        ))}
      </div>

      {!items && (
        <motion.button className="primary" onClick={() => generate()} disabled={!canGenerate} whileTap={{ scale: 0.97 }}>
          <motion.span
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}
            style={{ display: "flex" }}
          >
            <Sparkles size={18} />
          </motion.span>
          {loading ? "作成中…" : "メニューを作成"}
        </motion.button>
      )}
      {error && <div className="ai-error">{error}</div>}

      <div style={{ marginTop: 16 }}>
        {loading && <AiSkeleton />}
        {items && (
          <>
            {items.map((it, i) => {
              const on = picked.has(i);
              const part = PARTS.find((p) => p.id === it.part);
              return (
                <motion.button
                  key={i}
                  type="button"
                  className={`ai-item ${on ? "on" : ""}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic(4);
                    const n = new Set(picked);
                    if (on) n.delete(i);
                    else n.add(i);
                    setPicked(n);
                  }}
                  aria-pressed={on}
                  data-testid="ai-item"
                >
                  <span className="check">{on && <Check size={14} strokeWidth={3.5} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div className="n">
                      {part && (
                        <span className="part-tag" style={{ background: part.color }}>
                          {part.label}
                        </span>
                      )}
                      {it.name}
                    </div>
                    <div className="m">
                      {fmtSet(it)}
                      {it.note ? ` ・ ${it.note}` : ""}
                    </div>
                  </span>
                </motion.button>
              );
            })}
            <motion.button className="primary" onClick={add} disabled={!picked.size || create.isPending} whileTap={{ scale: 0.97 }}>
              <Check size={18} strokeWidth={3} /> {picked.size}種目を追加
            </motion.button>
            <button className="secondary" onClick={() => generate()} disabled={loading}>
              <Sparkles size={16} /> 作り直す
            </button>
          </>
        )}
      </div>
    </div>
  );
}
