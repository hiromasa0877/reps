import { useState } from "react";
import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { haptic } from "../api";

type Props = { label: string; value: number; step: number; min: number; max: number; unit?: string; onChange: (v: number) => void };

export function Stepper({ label, value, step, min, max, unit, onChange }: Props) {
  // Direction of the last button press drives the number's slide animation (typing doesn't animate).
  const [bump, setBump] = useState({ n: 0, dir: 0 });
  const set = (v: number, dir: number) => {
    const n = Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    if (n === value) return;
    haptic(4);
    setBump((b) => ({ n: b.n + 1, dir }));
    onChange(n);
  };
  return (
    <div className="stepper">
      <div className="k">{label}</div>
      <div className="v">
        <motion.div
          key={bump.n}
          initial={bump.n ? { y: bump.dir * 12, opacity: 0.2 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 700, damping: 32 }}
          style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}
        >
          <input
            inputMode="decimal"
            aria-label={label}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            onFocus={(e) => e.target.select()}
            style={{ width: unit ? "60%" : "100%" }}
          />
          {unit && <small>{unit}</small>}
        </motion.div>
      </div>
      <div className="row">
        <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => set(value - step, -1)} aria-label={`${label}を減らす`}>
          <Minus size={16} strokeWidth={3} />
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => set(value + step, 1)} aria-label={`${label}を増やす`}>
          <Plus size={16} strokeWidth={3} />
        </motion.button>
      </div>
    </div>
  );
}
