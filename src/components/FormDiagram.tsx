import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PARTS, type Exercise, type Motion } from "../../shared/catalog";

type Pt = [number, number];
type Joint = "H" | "S" | "E" | "W" | "P" | "K" | "A" | "E2" | "W2" | "K2" | "A2";
type Pose = Partial<Record<Joint, Pt>>;

const GROUND = 155;
const STAND: Pose = { H: [100, 34], S: [100, 52], P: [100, 98], K: [101, 126], A: [100, GROUND], E: [106, 75], W: [111, 97] };
const BENCH_BODY: Pose = { H: [152, 102], S: [138, 106], P: [88, 108], K: [58, 104], A: [56, GROUND] };
const pose = (base: Pose, over: Pose): Pose => ({ ...base, ...over });

/** Two key poses per movement (side view unless noted); the figure loops start → end → start. */
const POSES: Record<Motion, [Pose, Pose]> = {
  bench: [pose(BENCH_BODY, { E: [138, 82], W: [138, 58] }), pose(BENCH_BODY, { E: [124, 110], W: [136, 90] })],
  fly: [pose(BENCH_BODY, { E: [138, 82], W: [138, 58] }), pose(BENCH_BODY, { E: [132, 98], W: [122, 112] })],
  pushup: [
    { H: [152, 98], S: [138, 104], E: [138, 130], W: [138, GROUND], P: [90, 124], K: [64, 138], A: [40, 152] },
    { H: [154, 130], S: [140, 134], E: [122, 142], W: [138, GROUND], P: [90, 140], K: [64, 146], A: [40, 152] },
  ],
  deadlift: [
    { H: [134, 80], S: [124, 90], E: [120, 114], W: [116, 138], P: [84, 100], K: [110, 126], A: [100, GROUND] },
    STAND,
  ],
  pullup: [
    { H: [106, 40], S: [100, 54], E: [100, 35], W: [100, 16], P: [100, 100], K: [103, 128], A: [99, 154] },
    { H: [108, 16], S: [100, 28], E: [116, 24], W: [100, 16], P: [100, 74], K: [104, 102], A: [98, 128] },
  ],
  row: [
    { H: [134, 66], S: [124, 74], E: [124, 98], W: [124, 122], P: [84, 92], K: [106, 122], A: [100, GROUND] },
    { H: [134, 66], S: [124, 74], E: [104, 78], W: [116, 98], P: [84, 92], K: [106, 122], A: [100, GROUND] },
  ],
  squat: [
    pose(STAND, { E: [86, 64], W: [94, 50] }),
    { H: [116, 66], S: [108, 82], E: [94, 94], W: [102, 80], P: [78, 114], K: [118, 120], A: [100, GROUND] },
  ],
  lunge: [
    pose(STAND, { K: [104, 126], A: [106, GROUND], K2: [97, 126], A2: [94, GROUND] }),
    { H: [100, 52], S: [100, 70], E: [101, 94], W: [102, 118], P: [98, 116], K: [126, 120], A: [126, GROUND], K2: [88, 146], A2: [66, 152] },
  ],
  calf: [STAND, { H: [100, 26], S: [100, 44], E: [101, 68], W: [102, 92], P: [100, 90], K: [101, 118], A: [100, 147] }],
  bridge: [
    { H: [36, 146], S: [52, 147], E: [76, 149], W: [98, 146], P: [100, 148], K: [128, 120], A: [140, GROUND] },
    { H: [36, 144], S: [52, 142], E: [78, 130], W: [102, 116], P: [104, 118], K: [130, 116], A: [140, GROUND] },
  ],
  ohp: [pose(STAND, { E: [116, 72], W: [110, 50] }), pose(STAND, { E: [104, 30], W: [102, 8] })],
  // front view
  lateral: [
    { ...STAND, K: [92, 126], A: [90, GROUND], K2: [108, 126], A2: [110, GROUND], E: [92, 76], W: [90, 98], E2: [108, 76], W2: [110, 98] },
    { ...STAND, K: [92, 126], A: [90, GROUND], K2: [108, 126], A2: [110, GROUND], E: [78, 54], W: [56, 52], E2: [122, 54], W2: [144, 52] },
  ],
  frontraise: [STAND, pose(STAND, { E: [122, 54], W: [146, 52] })],
  curl: [pose(STAND, { E: [102, 76], W: [104, 100] }), pose(STAND, { E: [102, 76], W: [118, 58] })],
  pushdown: [pose(STAND, { E: [104, 76], W: [122, 62] }), pose(STAND, { E: [104, 76], W: [106, 100] })],
  crunch: [
    { H: [150, 146], S: [134, 148], E: [146, 136], W: [154, 138], P: [90, 150], K: [68, 124], A: [48, 152] },
    { H: [138, 122], S: [126, 132], E: [134, 120], W: [144, 118], P: [90, 150], K: [68, 124], A: [48, 152] },
  ],
  plank: [
    { H: [152, 124], S: [138, 128], E: [138, 152], W: [156, 152], P: [90, 136], K: [64, 144], A: [40, 152] },
    { H: [152, 123], S: [138, 127], E: [138, 152], W: [156, 152], P: [90, 133], K: [64, 143], A: [40, 152] },
  ],
  legraise: [
    { H: [160, 148], S: [144, 150], E: [124, 152], W: [108, 152], P: [98, 152], K: [72, 150], A: [46, 151] },
    { H: [160, 148], S: [144, 150], E: [124, 152], W: [108, 152], P: [98, 152], K: [96, 124], A: [92, 96] },
  ],
};

const BONES: [Joint, Joint, boolean?][] = [
  ["K2", "A2", true],
  ["P", "K2", true],
  ["S", "P"],
  ["P", "K"],
  ["K", "A"],
  ["S", "E2", true],
  ["E2", "W2", true],
  ["S", "E"],
  ["E", "W"],
];

const DURATION = 3.2;
const TIMES = [0, 0.4, 0.5, 0.9, 1];
const loop = { duration: DURATION, times: TIMES, repeat: Infinity, ease: "easeInOut" as const };

function track(a: Pose, b: Pose, j: Joint) {
  const p0 = a[j]!;
  const p1 = b[j] ?? p0;
  return { x: [p0[0], p1[0], p1[0], p0[0], p0[0]], y: [p0[1], p1[1], p1[1], p0[1], p0[1]] };
}

/** Point a fraction of the way from joint `from` to joint `to`, keyframed. */
function along(a: Pose, b: Pose, from: Joint, to: Joint, t: number) {
  const f = track(a, b, from);
  const g = track(a, b, to);
  return { x: f.x.map((v, i) => v + (g.x[i] - v) * t), y: f.y.map((v, i) => v + (g.y[i] - v) * t) };
}

const FOCUS: Record<string, [Joint, Joint, number]> = {
  chest: ["S", "P", 0.22],
  back: ["S", "P", 0.38],
  legs: ["P", "K", 0.5],
  shoulders: ["S", "E", 0.15],
  arms: ["S", "E", 0.6],
  abs: ["S", "P", 0.68],
};

export function FormFigure({ exercise, size = 220 }: { exercise: Exercise; size?: number }) {
  const [a, b] = POSES[exercise.motion];
  const color = PARTS.find((p) => p.id === exercise.part)!.color;
  const [fj, tj, ft] = FOCUS[exercise.part];
  const focus = along(a, b, fj, tj, ft);
  const loadAt: Joint = exercise.motion === "bridge" ? "P" : "W";
  const load = track(a, b, loadAt);
  const load2 = a.W2 ? track(a, b, "W2") : null;
  const head = track(a, b, "H");
  const eq = exercise.equipment;
  const m = exercise.motion;
  const pulley: Pt | null = eq === "cable" ? (m === "pushdown" ? [124, -8] : [100, -8]) : null;

  return (
    <svg viewBox="0 -12 200 176" width={size} height={size * 0.88} role="img" aria-label={`${exercise.name}のフォーム`}>
      <line x1="10" y1={GROUND + 2} x2="190" y2={GROUND + 2} stroke="rgba(15,20,40,.12)" strokeWidth="3" strokeLinecap="round" />
      {(m === "bench" || m === "fly") && (
        <g fill="rgba(15,20,40,.16)">
          <rect x="44" y="114" width="108" height="8" rx="4" />
          <rect x="56" y="122" width="6" height={GROUND - 122} />
          <rect x="134" y="122" width="6" height={GROUND - 122} />
        </g>
      )}
      {m === "pullup" && eq !== "cable" && (
        <line x1="62" y1="16" x2="138" y2="16" stroke="rgba(15,20,40,.35)" strokeWidth="5" strokeLinecap="round" />
      )}
      {pulley && (
        <>
          <circle cx={pulley[0]} cy={pulley[1]} r="5" fill="rgba(15,20,40,.3)" />
          <motion.line
            x1={pulley[0]}
            y1={pulley[1]}
            stroke="rgba(15,20,40,.3)"
            strokeWidth="2"
            initial={false}
            animate={{ x2: load.x, y2: load.y }}
            transition={loop}
          />
        </>
      )}

      <motion.circle
        r="13"
        fill={color}
        initial={false}
        animate={{ cx: focus.x, cy: focus.y, opacity: [0.25, 0.6, 0.6, 0.25, 0.25], scale: [1, 1.25, 1.25, 1, 1] }}
        transition={loop}
        style={{ filter: "blur(2px)" }}
      />

      {BONES.map(([j1, j2, back]) =>
        a[j1] && a[j2] ? (
          <motion.line
            key={`${j1}${j2}`}
            stroke={back ? "#9aa1b1" : "#0b0d12"}
            strokeWidth="7"
            strokeLinecap="round"
            initial={false}
            animate={{
              x1: track(a, b, j1).x,
              y1: track(a, b, j1).y,
              x2: track(a, b, j2).x,
              y2: track(a, b, j2).y,
            }}
            transition={loop}
          />
        ) : null,
      )}
      <motion.circle r="10" fill="#0b0d12" initial={false} animate={{ cx: head.x, cy: head.y }} transition={loop} />

      {eq === "barbell" && (
        <motion.g initial={false} animate={{ x: load.x, y: load.y }} transition={loop}>
          <circle r="13" fill="#2b2f3a" />
          <circle r="4" fill="#fff" />
        </motion.g>
      )}
      {eq === "dumbbell" &&
        [load, load2].filter(Boolean).map((l, i) => (
          <motion.g key={i} initial={false} animate={{ x: l!.x, y: l!.y }} transition={loop}>
            <rect x="-9" y="-5" width="18" height="10" rx="4" fill="#2b2f3a" />
          </motion.g>
        ))}
      {eq === "cable" && (
        <motion.g initial={false} animate={{ x: load.x, y: load.y }} transition={loop}>
          <rect x="-10" y="-2.5" width="20" height="5" rx="2.5" fill="#2b2f3a" />
        </motion.g>
      )}
    </svg>
  );
}

/** Animated figure + synced phase label + key form cues. */
export function FormGuide({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    // Phase flips at the midpoint of each loop, matching the figure's keyframes.
    let i = 0;
    setPhase(0);
    const id = setInterval(() => setPhase(++i % 2), (DURATION * 1000) / 2);
    return () => clearInterval(id);
  }, [exercise.name]);
  const part = PARTS.find((p) => p.id === exercise.part)!;

  return (
    <div className="form-guide" data-testid="form-guide">
      <div className="form-stage">
        <span className="form-part" style={{ background: part.color }}>
          {part.label}
        </span>
        <FormFigure exercise={exercise} size={compact ? 180 : 230} />
        <div className="form-phase">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {exercise.phases[phase]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <ol className="form-tips">
        {exercise.tips.map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
            <span className="n" style={{ background: part.color }}>
              {i + 1}
            </span>
            {t}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
