import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { CalendarCheck, Flame, Trophy, Weight } from "lucide-react";
import { WEEKDAYS, addDays, api, daysBetween, fromKey, todayKey, type PartStat } from "../api";
import { PARTS, type Part } from "../../shared/catalog";
import { BodyMap, MiniBody } from "./BodyFigure";
import { StatsSkeleton } from "./Skeleton";

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("ja-JP"));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return c.stop;
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

export function StatsView() {
  const today = todayKey();
  // 4 full weeks ending this Sunday, Monday-aligned for the heatmap.
  const end = addDays(today, (7 - fromKey(today).getDay()) % 7);
  const start = addDays(end, -27);
  const q = useQuery({ queryKey: ["summary", start, end], queryFn: () => api.summary(start, end) });
  const parts = useQuery({ queryKey: ["summary", "parts", start, end], queryFn: () => api.parts(start, end) });

  return (
    <>
      <motion.header className="topbar glass" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1>記録</h1>
        <div className="sub">直近4週間</div>
      </motion.header>
      {q.isPending ? <StatsSkeleton /> : <StatsBody data={q.data ?? []} start={start} today={today} parts={parts.data ?? []} />}
    </>
  );
}

function StatsBody({
  data,
  start,
  today,
  parts,
}: {
  data: { date: string; total: number; done: number; volume: number }[];
  start: string;
  today: string;
  parts: PartStat[];
}) {
  const partMax = Math.max(1, ...parts.map((p) => p.done));
  const [picked, setPicked] = useState<Part | null>(null);
  const dayMax = Math.max(1, ...parts.map((p) => p.days));
  const statOf = (p: Part) => parts.find((x) => x.part === p);
  const pickedStat = picked ? statOf(picked) : undefined;
  const pickedMeta = PARTS.find((p) => p.id === picked);
  const by = new Map(data.map((d) => [d.date, d]));
  const days = Array.from({ length: 28 }, (_, i) => addDays(start, i));

  let streak = 0;
  for (let d = by.get(today)?.done ? today : addDays(today, -1); by.get(d)?.done; d = addDays(d, -1)) streak++;

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekDone = last7.reduce((s, d) => s + (by.get(d)?.done ?? 0), 0);
  const activeDays = days.filter((d) => (by.get(d)?.done ?? 0) > 0).length;
  const volume = data.reduce((s, d) => s + (d.volume ?? 0), 0);
  const max = Math.max(1, ...last7.map((d) => by.get(d)?.done ?? 0));

  const stats = [
    { k: "連続日数", v: streak, unit: "日", icon: <Flame size={14} color="#ff9500" /> },
    { k: "7日間の種目数", v: weekDone, unit: "種目", icon: <Trophy size={14} color="#eab308" /> },
    { k: "実施日数", v: activeDays, unit: "/28日", icon: <CalendarCheck size={14} color="#22c55e" /> },
    { k: "総ボリューム", v: volume, unit: "kg", icon: <Weight size={14} color="#0a84ff" /> },
  ];

  return (
    <div>
      <motion.div className="glass panel" style={{ marginTop: 0, marginBottom: 10 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <h3>鍛えた部位（直近4週間）</h3>
        <BodyMap
          intensity={(p) => (statOf(p)?.days ?? 0) / dayMax}
          selected={picked}
          onSelect={(p) => setPicked((cur) => (cur === p ? null : p))}
        />
        <AnimatePresence mode="wait" initial={false}>
          {pickedMeta ? (
            <motion.div
              key={pickedMeta.id}
              className="hotspot-card"
              style={{ ["--pc" as string]: pickedMeta.color }}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              data-testid="hotspot-card"
            >
              <div className="h">
                <MiniBody parts={[pickedMeta.id]} size={18} />
                {pickedMeta.label}
              </div>
              <div className="m">
                {pickedStat
                  ? `${pickedStat.days}日・${pickedStat.done}種目 ／ 最終 ${daysBetween(pickedStat.last, today) === 0 ? "今日" : `${daysBetween(pickedStat.last, today)}日前`}`
                  : "この期間の記録なし"}
              </div>
              {!!pickedStat?.names.length && (
                <div className="names">
                  {pickedStat.names.map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="hint" className="hint" style={{ marginTop: 8 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              部位をタップで詳細
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="stat-grid">
        {stats.map((s, i) => (
          <motion.div
            key={s.k}
            className="glass stat"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 26 }}
          >
            <div className="k">
              {s.icon}
              {s.k}
            </div>
            <div className="v" data-testid={`stat-${i}`}>
              <CountUp value={s.v} />
              <small>{s.unit}</small>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div className="glass panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3>直近7日の種目数</h3>
        <div className="bars">
          {last7.map((d, i) => {
            const v = by.get(d)?.done ?? 0;
            return (
              <div className="col" key={d}>
                <span className="val">{v || ""}</span>
                <motion.div
                  className={`b ${v ? "" : "zero"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (v / max) * 100)}%` }}
                  transition={{ delay: 0.25 + i * 0.05, type: "spring", stiffness: 160, damping: 18 }}
                  style={{ maxHeight: 100 }}
                />
                <span className="lbl" style={d === today ? { color: "var(--text)" } : undefined}>
                  {WEEKDAYS[fromKey(d).getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="glass panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3>部位別の種目数</h3>
        <div className="part-bars">
          {PARTS.map((p, i) => {
            const v = parts.find((x) => x.part === p.id)?.done ?? 0;
            return (
              <div className="row" key={p.id}>
                <span>{p.label}</span>
                <div className="track">
                  <motion.div
                    className="fill"
                    style={{ background: p.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / partMax) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <span className="num">{v}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div className="glass panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3>アクティビティ</h3>
        <div className="heat" style={{ marginBottom: 8 }}>
          {["月", "火", "水", "木", "金", "土", "日"].map((w) => (
            <span key={w} style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textAlign: "center" }}>
              {w}
            </span>
          ))}
        </div>
        <div className="heat">
          {days.map((d, i) => {
            const v = by.get(d)?.done ?? 0;
            const lvl = v === 0 ? "" : v < 3 ? "l1" : v < 5 ? "l2" : "l3";
            return (
              <motion.i
                key={d}
                className={`${lvl} ${d === today ? "today" : ""}`}
                title={`${d}: ${v}`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: d > today ? 0.35 : 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.012 }}
              />
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
