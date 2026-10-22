import { useRef } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { BookOpen, Check, ChevronsLeft, ChevronsRight, Play, Trash2, Undo2 } from "lucide-react";
import { PARTS, findExercise } from "../../shared/catalog";
import { fmtDate, haptic, type Task } from "../api";
import { STATUS_META, nextStatus, prevStatus } from "../useTasks";

const THRESHOLD = 88;

type Props = {
  task: Task;
  index: number;
  onAdvance: () => void;
  onBack: () => void;
  onDelete: () => void;
  onSets: (n: number) => void;
  onOpen: () => void;
  onForm: () => void;
};

export function TaskCard({ task, index, onAdvance, onBack, onDelete, onSets, onOpen, onForm }: Props) {
  const x = useMotionValue(0);
  const armed = useRef<"left" | "right" | null>(null);
  const dragged = useRef(false); // a drag must never also count as a tap
  const next = nextStatus(task.status);
  const prev = prevStatus(task.status);

  const rightColor = next ? STATUS_META[next].color : "transparent";
  const leftColor = prev ? STATUS_META[prev].color : "#ff3b30";
  const rightOpacity = useTransform(x, [0, 24, THRESHOLD], [0, 0.55, 1]);
  const leftOpacity = useTransform(x, [-THRESHOLD, -24, 0], [1, 0.55, 0]);
  const rightIcon = useTransform(x, [0, THRESHOLD, THRESHOLD + 40], [0.6, 1, 1.2]);
  const leftIcon = useTransform(x, [-THRESHOLD - 40, -THRESHOLD, 0], [1.2, 1, 0.6]);
  const underBg = useTransform(x, (v) => (v >= 0 ? rightColor : leftColor));
  const underOpacity = useTransform(x, (v) => Math.min(1, Math.abs(v) / 16)); // invisible at rest

  // Light haptic tick when crossing the commit threshold, so the user feels "it will apply".
  useMotionValueEvent(x, "change", (v) => {
    const state = v > THRESHOLD && next ? "right" : v < -THRESHOLD ? "left" : null;
    if (state !== armed.current) {
      armed.current = state;
      if (state) haptic(8);
    }
  });

  const settle = () => animate(x, 0, { type: "spring", stiffness: 520, damping: 34 });

  const meta = STATUS_META[task.status];
  const weight = task.weight > 0 ? `${task.weight}kg` : "自重";
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
      data-status={task.status}
    >
      <div className="card-under" aria-hidden>
        <motion.div className="side" style={{ opacity: rightOpacity }}>
          <motion.div style={{ scale: rightIcon, display: "flex" }}>
            {next === "done" ? <Check size={20} strokeWidth={3} /> : <Play size={18} fill="currentColor" />}
          </motion.div>
          {next && STATUS_META[next].label}
        </motion.div>
        <motion.div className="side" style={{ opacity: leftOpacity }}>
          {prev ? STATUS_META[prev].label : "削除"}
          <motion.div style={{ scale: leftIcon, display: "flex" }}>
            {prev ? <Undo2 size={19} strokeWidth={2.6} /> : <Trash2 size={19} strokeWidth={2.6} />}
          </motion.div>
        </motion.div>
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            borderRadius: "inherit",
            background: underBg,
            opacity: underOpacity,
          }}
        />
      </div>

      <motion.div
        className={`card glass ${task.status}`}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: next ? 0.9 : 0.12 }}
        dragMomentum={false}
        onPointerDown={() => (dragged.current = false)}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const fast = Math.abs(info.velocity.x) > 650 && Math.abs(dx) > 36;
          if (next && (dx > THRESHOLD || (fast && dx > 0))) {
            onAdvance();
          } else if (dx < -THRESHOLD || (fast && dx < 0)) {
            if (prev) onBack();
            else {
              animate(x, -window.innerWidth, { duration: 0.2 });
              onDelete();
              return;
            }
          }
          settle();
        }}
        onTap={(e) => {
          if (dragged.current) return;
          if ((e.target as HTMLElement).closest(".set-dot, .form-btn")) return;
          onOpen();
        }}
        whileTap={{ scale: 0.985 }}
        role="button"
        tabIndex={0}
        aria-label={`${task.name} ${meta.label}`}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpen();
          if (e.key === "ArrowRight" && next) onAdvance();
          if (e.key === "ArrowLeft") (prev ? onBack : onDelete)();
        }}
      >
        <motion.div className="bar" animate={{ background: meta.color }} />
        <div className="body">
          <div className="name">
            {part && (
              <span className="part-tag" style={{ background: part.color }}>
                {part.label}
              </span>
            )}
            {task.name}
          </div>
          <div className="meta">
            <b>{weight}</b> × <b>{task.reps}</b>回 × <b>{task.sets}</b>セット
          </div>
          {task.prev && (
            <div className="prev" data-testid="prev">
              前回 {fmtDate(task.prev.date)} {task.prev.weight > 0 ? `${task.prev.weight}kg` : "自重"}×{task.prev.reps}×{task.prev.sets}
              {delta !== 0 && <span className={`delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}kg</span>}
            </div>
          )}
          {task.note && <div className="note">{task.note}</div>}
          <div className="sets">
            {Array.from({ length: task.sets }, (_, i) => {
              const on = i < task.done_sets;
              return (
                <motion.button
                  key={i}
                  className={`set-dot ${on ? "on" : ""}`}
                  aria-label={`${i + 1}セット目`}
                  aria-pressed={on}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSets(task.done_sets === i + 1 ? i : i + 1);
                  }}
                  whileTap={{ scale: 0.8 }}
                  animate={on ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.28 }}
                >
                  {on ? <Check size={13} strokeWidth={3.5} /> : i + 1}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="side-col">
        <motion.div
          className="status-badge"
          animate={{ background: meta.color, rotate: task.status === "done" ? 360 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {task.status === "done" ? (
            <Check size={18} strokeWidth={3} />
          ) : task.status === "doing" ? (
            <Play size={14} fill="currentColor" />
          ) : (
            <ChevronsRight size={18} strokeWidth={2.6} />
          )}
        </motion.div>
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
        </div>
      </motion.div>
    </motion.li>
  );
}

export function SwipeHint() {
  return (
    <motion.div className="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
      <motion.span animate={{ x: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        <ChevronsLeft size={14} /> 戻す
      </motion.span>
      <span style={{ color: "var(--faint)" }}>|</span>
      <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        進める <ChevronsRight size={14} />
      </motion.span>
    </motion.div>
  );
}
