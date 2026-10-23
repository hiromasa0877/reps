import { motion } from "motion/react";
import { PARTS, type Part } from "../../shared/catalog";

const NEUTRAL = "rgba(15,20,40,.1)";
const colorOf = (p: Part) => PARTS.find((x) => x.id === p)!.color;

/* ---------- mini figure for calendar cells (front view, lats shown as side wings) ---------- */

const MINI: { part: Part; el: React.ReactNode }[] = [
  { part: "shoulders", el: <><circle cx="6.6" cy="9.4" r="2.2" /><circle cx="17.4" cy="9.4" r="2.2" /></> },
  { part: "chest", el: <><rect x="8.3" y="7.9" width="3.6" height="4.6" rx="1.3" /><rect x="12.1" y="7.9" width="3.6" height="4.6" rx="1.3" /></> },
  { part: "back", el: <><path d="M6.8 11.4h1.4l1.2 6.2H8.1z" /><path d="M17.2 11.4h-1.4l-1.2 6.2h1.3z" /></> },
  { part: "abs", el: <rect x="9.5" y="13.1" width="5" height="6" rx="1.3" /> },
  { part: "arms", el: <><rect x="3.4" y="11.6" width="2.5" height="8.2" rx="1.25" /><rect x="18.1" y="11.6" width="2.5" height="8.2" rx="1.25" /></> },
  { part: "legs", el: <><rect x="8.7" y="20.2" width="3" height="10.8" rx="1.5" /><rect x="12.3" y="20.2" width="3" height="10.8" rx="1.5" /></> },
];

/** Tiny body: trained parts in full color, planned-but-unfinished parts tinted. */
export function MiniBody({ parts, planned = [], size = 22 }: { parts: Part[]; planned?: Part[]; size?: number }) {
  return (
    <svg viewBox="0 0 24 32" width={size} height={(size * 32) / 24} aria-hidden>
      <circle cx="12" cy="3.7" r="2.6" fill={parts.length ? "rgba(15,20,40,.28)" : NEUTRAL} />
      {MINI.map(({ part, el }, i) => {
        const done = parts.includes(part);
        const plan = !done && planned.includes(part);
        return (
          <motion.g
            key={part}
            initial={false}
            animate={{ fill: done ? colorOf(part) : plan ? colorOf(part) : NEUTRAL, opacity: plan ? 0.38 : 1 }}
            transition={{ duration: 0.35, delay: done ? i * 0.04 : 0 }}
          >
            {el}
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ---------- detailed body map (front + back) with tappable hotspots ---------- */

type Region = { part: Part; d?: string; rect?: [number, number, number, number, number]; ellipse?: [number, number, number, number] };

const mirror = (r: Region): Region => {
  if (r.rect) {
    const [x, y, w, h, rx] = r.rect;
    return { ...r, rect: [120 - x - w, y, w, h, rx] };
  }
  if (r.ellipse) {
    const [cx, cy, rx, ry] = r.ellipse;
    return { ...r, ellipse: [120 - cx, cy, rx, ry] };
  }
  // Mirror path x-coordinates (absolute commands with x,y pairs only).
  return { ...r, d: r.d!.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${120 - Number(x)} ${y}`) };
};
const pair = (r: Region) => [r, mirror(r)];

const FRONT: Region[] = [
  ...pair({ part: "shoulders", ellipse: [33, 53, 10, 9] }),
  ...pair({ part: "chest", d: "M41 46 Q52 41 59 45 L59 66 Q49 72 41 64 Z" }),
  ...[70, 82, 94].flatMap((y) => pair({ part: "abs", rect: [51, y, 8, 10, 3] })),
  ...pair({ part: "abs", d: "M41 68 Q45 72 49 72 L49 104 Q43 100 41 90 Z" }),
  ...pair({ part: "arms", rect: [21, 61, 11, 24, 5.5] }),
  ...pair({ part: "arms", rect: [17, 89, 10, 26, 5] }),
  ...pair({ part: "legs", rect: [42, 117, 15, 46, 7.5] }),
  ...pair({ part: "legs", rect: [44, 168, 11, 36, 5.5] }),
];
const BACK: Region[] = [
  { part: "back", d: "M46 38 Q60 32 74 38 L81 48 L39 48 Z" },
  ...pair({ part: "shoulders", ellipse: [33, 53, 10, 9] }),
  ...pair({ part: "back", d: "M41 50 L59 52 L59 92 Q49 88 43 76 Z" }),
  { part: "back", rect: [50, 94, 20, 11, 4] },
  ...pair({ part: "arms", rect: [21, 61, 11, 24, 5.5] }),
  ...pair({ part: "arms", rect: [17, 89, 10, 26, 5] }),
  ...pair({ part: "legs", ellipse: [51, 117, 10, 9] }),
  ...pair({ part: "legs", rect: [42, 128, 15, 36, 7.5] }),
  ...pair({ part: "legs", rect: [44, 168, 11, 36, 5.5] }),
];
/** Where each part's pulsing hotspot sits, per view. */
const HOTSPOTS: Record<"front" | "back", Partial<Record<Part, [number, number]>>> = {
  front: { chest: [50, 56], shoulders: [87, 53], abs: [60, 87], arms: [26, 73], legs: [70, 140] },
  back: { back: [50, 70], legs: [51, 117] },
};

function Silhouette() {
  return (
    <g fill="rgba(15,20,40,.06)">
      <ellipse cx="60" cy="20" rx="12" ry="14" />
      <rect x="54" y="32" width="12" height="9" rx="3" />
      <path d="M44 104 L76 104 L74 117 L46 117 Z" />
    </g>
  );
}

function View({
  regions,
  view,
  intensity,
  selected,
  onSelect,
}: {
  regions: Region[];
  view: "front" | "back";
  intensity: (p: Part) => number;
  selected: Part | null;
  onSelect: (p: Part) => void;
}) {
  return (
    <svg viewBox="0 0 120 210" className="bodymap-svg" role="group" aria-label={view === "front" ? "体の前面" : "体の背面"}>
      <Silhouette />
      {regions.map((r, i) => {
        const v = intensity(r.part);
        const fill = v > 0 ? colorOf(r.part) : NEUTRAL;
        const props = {
          onClick: () => onSelect(r.part),
          style: { cursor: "pointer" },
          initial: { opacity: 0, scale: 0.85 },
          animate: {
            opacity: v > 0 ? 0.3 + 0.7 * v : 1,
            scale: 1,
            fill,
            stroke: selected === r.part ? "#0b0d12" : "rgba(255,255,255,0.9)",
            strokeWidth: selected === r.part ? 2 : 1,
          },
          transition: { delay: 0.1 + i * 0.02, type: "spring" as const, stiffness: 260, damping: 22 },
          "data-part": r.part,
        };
        if (r.rect) {
          const [x, y, w, h, rx] = r.rect;
          return <motion.rect key={i} x={x} y={y} width={w} height={h} rx={rx} {...props} />;
        }
        if (r.ellipse) {
          const [cx, cy, rx, ry] = r.ellipse;
          return <motion.ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} {...props} />;
        }
        return <motion.path key={i} d={r.d} {...props} />;
      })}
      {Object.entries(HOTSPOTS[view]).map(([part, [x, y]]) =>
        intensity(part as Part) > 0 ? (
          <g key={part} style={{ pointerEvents: "none" }}>
            <motion.circle
              cx={x}
              cy={y}
              r="3"
              fill="none"
              stroke="#fff"
              strokeWidth="1.5"
              animate={{ r: [3, 9], opacity: [0.9, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
            />
            <circle cx={x} cy={y} r="2.6" fill="#fff" />
          </g>
        ) : null,
      )}
    </svg>
  );
}

export function BodyMap({
  intensity,
  selected,
  onSelect,
}: {
  intensity: (p: Part) => number;
  selected: Part | null;
  onSelect: (p: Part) => void;
}) {
  return (
    <div className="bodymap">
      <div>
        <View regions={FRONT} view="front" intensity={intensity} selected={selected} onSelect={onSelect} />
        <span>前</span>
      </div>
      <div>
        <View regions={BACK} view="back" intensity={intensity} selected={selected} onSelect={onSelect} />
        <span>後ろ</span>
      </div>
    </div>
  );
}

