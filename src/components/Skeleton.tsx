import { motion } from "motion/react";

const Sk = ({ w, h, r, style }: { w?: number | string; h: number; r?: number | string; style?: React.CSSProperties }) => (
  <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

export function CardSkeletons({ count = 4 }: { count?: number }) {
  const widths = [55, 48, 60, 42, 52];
  return (
    <div className="list" aria-busy="true" aria-label="読み込み中">
      <Sk w={64} h={14} style={{ margin: "10px 6px 0" }} />
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="glass sk-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="sk-lines">
            <Sk w={`${widths[i % 5]}%`} h={16} />
            <Sk w={`${widths[(i + 2) % 5] - 20}%`} h={12} />
            <Sk w={`${widths[(i + 1) % 5] + 10}%`} h={22} />
          </div>
          <Sk w={34} h={34} r="50%" />
        </motion.div>
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="topbar glass">
      <div className="topbar-row">
        <div className="grow">
          <Sk w={120} h={26} />
          <Sk w={84} h={13} style={{ marginTop: 8 }} />
        </div>
        <Sk w={58} h={58} r="50%" />
      </div>
      <div className="dates">
        {Array.from({ length: 7 }, (_, i) => (
          <Sk key={i} h={54} r={16} />
        ))}
      </div>
    </div>
  );
}

/** Mirrors the static skeleton in index.html so the hand-off to React is seamless. */
export function AppSkeleton() {
  return (
    <>
      <div className="app" aria-busy="true">
        <HeaderSkeleton />
        <CardSkeletons />
      </div>
      <div className="tabbar">
        <div className="tabs glass">
          <Sk w={220} h={52} r={99} />
        </div>
        <Sk w={64} h={64} r="50%" />
      </div>
    </>
  );
}

export function StatsSkeleton() {
  return (
    <div aria-busy="true">
      <div className="stat-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="glass stat">
            <Sk w={70} h={12} />
            <Sk w={90} h={30} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="glass panel">
        <Sk w={100} h={14} />
        <Sk h={140} style={{ marginTop: 14 }} />
      </div>
      <div className="glass panel">
        <Sk w={100} h={14} />
        <Sk h={160} style={{ marginTop: 14 }} />
      </div>
    </div>
  );
}

export function AiSkeleton() {
  return (
    <div aria-busy="true" aria-label="生成中">
      {Array.from({ length: 4 }, (_, i) => (
        <motion.div
          key={i}
          className="ai-item"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12 }}
        >
          <Sk w={24} h={24} r={8} />
          <div style={{ flex: 1 }}>
            <Sk w={`${50 + ((i * 13) % 30)}%`} h={15} />
            <Sk w="40%" h={11} style={{ marginTop: 7 }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
