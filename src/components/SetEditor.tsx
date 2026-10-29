import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CopyCheck, Minus, Plus, X } from "lucide-react";
import { haptic, type SetRow } from "../api";

function MiniStep({
  value,
  step,
  min,
  max,
  unit,
  label,
  onChange,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => {
    const n = Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    if (n !== value) haptic(4);
    onChange(n);
  };
  return (
    <div className="mini-step">
      <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => set(value - step)} aria-label={`${label}を減らす`}>
        <Minus size={14} strokeWidth={3} />
      </motion.button>
      <label>
        <input
          inputMode="decimal"
          aria-label={label}
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
        />
        <small>{unit}</small>
      </label>
      <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => set(value + step)} aria-label={`${label}を増やす`}>
        <Plus size={14} strokeWidth={3} />
      </motion.button>
    </div>
  );
}

/** Edit each set separately: weight, reps and a note per set. New sets copy the last one; set 1 can be copied to all. */
export function SetEditor({ sets, onChange }: { sets: SetRow[]; onChange: (sets: SetRow[]) => void }) {
  const patch = (i: number, p: Partial<SetRow>) => onChange(sets.map((s, j) => (j === i ? { ...s, ...p } : s)));
  // Stable keys so removing a middle set animates that row, not the last one.
  const seq = useRef(0);
  const ids = useRef<number[]>([]);
  while (ids.current.length < sets.length) ids.current.push(++seq.current);
  ids.current.length = sets.length;
  const [flash, setFlash] = useState(0); // bumps to pulse the rows that just received set 1's values
  const first = sets[0];
  const allSame = sets.every((s) => s.weight === first.weight && s.reps === first.reps);
  const copyFirst = () => {
    haptic([6, 30, 6]);
    onChange(sets.map((s, i) => (i === 0 ? s : { ...s, weight: first.weight, reps: first.reps })));
    setFlash((n) => n + 1);
  };
  return (
    <div className="set-editor" data-testid="set-editor">
      <AnimatePresence initial={false}>
        {sets.length > 1 && (
          <motion.button
            type="button"
            className="set-copy"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 36 }}
            exit={{ opacity: 0, height: 0 }}
            whileTap={{ scale: 0.96 }}
            disabled={allSame}
            onClick={copyFirst}
          >
            <CopyCheck size={15} />
            1セット目（{first.weight > 0 ? `${first.weight}kg` : "自重"}×{first.reps}回）を全セットにコピー
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {sets.map((s, i) => (
          <motion.div
            key={ids.current[i]}
            layout
            className="set-row"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            {i > 0 && flash > 0 && (
              <motion.span
                key={flash}
                className="set-flash"
                initial={{ opacity: 0.55 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
              />
            )}
            <div className="set-main">
              <span className="set-no">{i + 1}</span>
              <MiniStep label={`${i + 1}セット目の重量`} value={s.weight} step={2.5} min={0} max={999} unit="kg" onChange={(weight) => patch(i, { weight })} />
              <span className="x">×</span>
              <MiniStep label={`${i + 1}セット目の回数`} value={s.reps} step={1} min={1} max={200} unit="回" onChange={(reps) => patch(i, { reps })} />
              <motion.button
                type="button"
                className="set-del"
                whileTap={{ scale: 0.8 }}
                disabled={sets.length <= 1}
                onClick={() => {
                  haptic(6);
                  ids.current.splice(i, 1);
                  onChange(sets.filter((_, j) => j !== i));
                }}
                aria-label={`${i + 1}セット目を削除`}
              >
                <X size={15} strokeWidth={2.6} />
              </motion.button>
            </div>
            <input
              className="set-note"
              placeholder="メモ（休憩時間・感覚など）"
              aria-label={`${i + 1}セット目のメモ`}
              maxLength={60}
              value={s.note}
              onChange={(e) => patch(i, { note: e.target.value })}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <motion.button
        type="button"
        className="set-add"
        whileTap={{ scale: 0.97 }}
        disabled={sets.length >= 20}
        onClick={() => {
          haptic(6);
          const last = sets[sets.length - 1] ?? { weight: 0, reps: 10, note: "" };
          onChange([...sets, { ...last, note: "" }]);
        }}
      >
        <Plus size={16} strokeWidth={3} /> セットを追加
      </motion.button>
    </div>
  );
}
