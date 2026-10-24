import { useRef } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { BookOpen, ChevronsLeft, Trash2 } from "lucide-react";
import { PARTS, findExercise } from "../../shared/catalog";
import { fmtDate, fmtSets, fmtWeight, haptic, type Task } from "../api";

const THRESHOLD = 88;

type Props = {
  task: Task;
  index: number;
  onDelete: () => void;
  onOpen: () => void;
  onForm: () => void;
};

/** One logged exercise. Entries are complete once registered; swipe left to delete (undo in the toast). */
export function TaskCard({ task, index, onDelete, onOpen, onForm }: Props) {
  const x = useMotionValue(0);
  const armed = useRef(false);
  const dragged = useRef(false); // a drag must never also count as a tap

  const deleteOpacity = useTransform(x, [-THRESHOLD, -24, 0], [1, 0.55, 0]);
  const deleteIcon = useTransform(x, [-THRESHOLD - 40, -THRESHOLD, 0], [1.2, 1, 0.6]);
  const underOpacity = useTransform(x, (v) => Math.min(1, Math.abs(v) / 16)); // invisible at rest

  // Light haptic tick when crossing the delete threshold, so the user feels "it will apply".
  useMotionValueEvent(x, "change", (v) => {
    const over = v < -THRESHOLD;
    if (over !== armed.current) {
      armed.current = over;
      if (over) haptic(8);
    }
  });

  const notes = task.set_list.map((s, i) => (s.note ? `${i + 1}: ${s.note}` : "")).filter(Boolean);
  const part = PARTS.find((p) => p.id === task.part);
  const hasForm = !!findExercise(task.name);
  const delta = task.prev ? task.weight - task.prev.weight : 0;

  return (
    <motion.li
      layout
      className="card-wrap"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -260, transition: { duration: 0.22 } }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 36 }, delay: Math.min(index, 8) * 0.035 }}
      data-testid="task"
    >
      <div className="card-under" aria-hidden>
        <span />
        <motion.div className="side" style={{ opacity: deleteOpacity }}>
          削除
          <motion.div style={{ scale: deleteIcon, display: "flex" }}>
            <Trash2 size={19} strokeWidth={2.6} />
          </motion.div>
        </motion.div>
        <motion.div
          style={{ position: "absolute", inset: 0, zIndex: -1, borderRadius: "inherit", background: "#ff3b30", opacity: underOpacity }}
        />
      </div>

      <motion.div
        className="card glass"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0.08 }}
        dragMomentum={false}
        onPointerDown={() => (dragged.current = false)}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const fast = info.velocity.x < -650 && dx < -36;
          if (dx < -THRESHOLD || fast) {
            animate(x, -window.innerWidth, { duration: 0.2 });
            onDelete();
            return;
          }
          animate(x, 0, { type: "spring", stiffness: 520, damping: 34 });
        }}
        onTap={(e) => {
          if (dragged.current) return;
          if ((e.target as HTMLElement).closest(".form-btn")) return;
          onOpen();
        }}
        whileTap={{ scale: 0.985 }}
        role="button"
        tabIndex={0}
        aria-label={task.name}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpen();
          if (e.key === "Delete" || e.key === "Backspace") onDelete();
        }}
      >
        <div className="bar" style={{ background: part?.color ?? "#8e96a8" }} />
        <div className="body">
          <div className="name">
            {part && (
              <span className="part-tag" style={{ background: part.color }}>
                {part.label}
              </span>
            )}
            {task.name}
          </div>
          <div className="set-chips" aria-label={`${task.sets}セット`}>
            {task.set_list.map((s, i) => (
              <span key={i} className="set-chip">
                <i>{i + 1}</i>
                {fmtWeight(s.weight)}×{s.reps}
              </span>
            ))}
          </div>
          {notes.length > 0 && <div className="set-notes">{notes.join(" ／ ")}</div>}
          {task.prev && (
            <div className="prev" data-testid="prev">
              前回 {fmtDate(task.prev.date)} {fmtSets(task.prev.set_list)}
              {delta !== 0 && <span className={`delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}kg</span>}
            </div>
          )}
          {task.note && <div className="note">{task.note}</div>}
        </div>
        {hasForm && (
          <motion.button
            className="form-btn"
            aria-label={`${task.name}のフォーム`}
            whileTap={{ scale: 0.85 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onForm();
            }}
          >
            <BookOpen size={16} />
          </motion.button>
        )}
      </motion.div>
    </motion.li>
  );
}

export function SwipeHint() {
  return (
    <motion.div className="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
      <motion.span animate={{ x: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        <ChevronsLeft size={14} /> 左にスワイプで削除
      </motion.span>
    </motion.div>
  );
}
