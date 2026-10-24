import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Trash2 } from "lucide-react";
import { findExercise } from "../../shared/catalog";
import { api, fmtDate, fmtSets, type Task } from "../api";
import { FormGuide } from "./FormDiagram";
import { useTasks } from "../useTasks";
import { Sheet } from "./Sheet";
import { SetEditor } from "./SetEditor";

export function EditSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Task | null>(task);
  useEffect(() => {
    if (task) setDraft(task);
  }, [task]);
  const { update, remove } = useTasks(draft?.date ?? "");
  const [showForm, setShowForm] = useState(false);
  const name = task?.name ?? "";
  const history = useQuery({ queryKey: ["history", name], queryFn: () => api.history(name), enabled: !!name });
  const exercise = draft ? findExercise(draft.name) : undefined;
  useEffect(() => setShowForm(false), [task?.id]);

  return (
    <Sheet open={!!task} onClose={onClose} label="種目を編集" title="編集">
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { name, set_list, note } = draft;
            update.mutate({ id: draft.id, patch: { name, set_list, note } });
            onClose();
          }}
        >
          <input
            className="field"
            aria-label="種目名"
            value={draft.name}
            maxLength={60}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="label">セット（{draft.set_list.length}）</div>
          <SetEditor sets={draft.set_list} onChange={(set_list) => setDraft({ ...draft, set_list })} />
          {!!history.data?.length && (
            <>
              <div className="label">これまでの記録</div>
              <div className="history" data-testid="history">
                {history.data.map((h, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <span>{fmtDate(h.date)}</span>
                    <span>{fmtSets(h.set_list)}</span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
          {exercise && (
            <button type="button" className="link-btn" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
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
          <div className="label">メモ</div>
          <input
            className="field"
            style={{ fontSize: 15, fontWeight: 600 }}
            aria-label="メモ"
            placeholder="種目全体のメモ"
            value={draft.note}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <motion.button className="primary" type="submit" disabled={!draft.name.trim()} whileTap={{ scale: 0.97 }}>
            <Check size={18} strokeWidth={3} /> 保存
          </motion.button>
          <motion.button
            className="secondary danger"
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              remove(draft);
              onClose();
            }}
          >
            <Trash2 size={17} /> 削除
          </motion.button>
        </form>
      )}
    </Sheet>
  );
}
