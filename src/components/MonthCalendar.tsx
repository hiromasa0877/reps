import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PARTS, type Part } from "../../shared/catalog";
import { addDays, api, daysBetween, fromKey, haptic, toKey, todayKey, type DaySummary } from "../api";
import { MiniBody } from "./BodyFigure";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const COLLAPSE_KEY = "reps.calendarCollapsed";

const monthStart = (key: string) => key.slice(0, 8) + "01";
const shiftMonth = (m: string, n: number) => {
  const d = fromKey(m);
  return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => v.toFixed(digits));
  useEffect(() => animate(mv, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] }).stop, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

/** Tap feedback: a ripple spreading from the touch point. */
function useRipple() {
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null);
  const start = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, k: Date.now() });
  };
  const node = (
    <AnimatePresence>
      {ripple && (
        <motion.span
          key={ripple.k}
          className="ripple"
          style={{ left: ripple.x, top: ripple.y }}
          initial={{ scale: 0, opacity: 0.35 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onAnimationComplete={() => setRipple(null)}
        />
      )}
    </AnimatePresence>
  );
  return { start, node };
}

function DayCell({
  day,
  inMonth,
  selected,
  isToday,
  dim,
  s,
  index,
  onPick,
}: {
  day: string;
  inMonth: boolean;
  selected: boolean;
  isToday: boolean;
  dim: boolean;
  s?: DaySummary;
  index: number;
  onPick: () => void;
}) {
  const ripple = useRipple();
  const trained = !!s?.parts.length;
  const wd = fromKey(day).getDay();
  return (
    <motion.button
      className={`cal-day ${inMonth ? "" : "out"} ${trained ? "trained" : s?.planned.length ? "planned" : ""} ${selected ? "sel" : ""} ${isToday ? "today" : ""} ${wd === 0 ? "sun" : wd === 6 ? "sat" : ""}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: dim ? 0.22 : 1, scale: 1 }}
      transition={{ delay: index * 0.008, type: "spring", stiffness: 420, damping: 30 }}
      whileTap={{ scale: 0.9 }}
      onPointerDown={ripple.start}
      onClick={onPick}
      aria-label={`${day}${trained ? ` ${s!.parts.map((p) => PARTS.find((x) => x.id === p)!.label).join("・")}` : ""}`}
      aria-pressed={selected}
      data-testid="cal-day"
      data-parts={s?.parts.join(",") ?? ""}
    >
      {selected && <motion.span layoutId="cal-sel" className="cal-sel" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
      {ripple.node}
      <span className="n">{fromKey(day).getDate()}</span>
      <MiniBody parts={s?.parts ?? []} planned={s?.planned ?? []} size={27} />
    </motion.button>
  );
}

export function MonthCalendar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayKey();
  const [month, setMonth] = useState(() => monthStart(date));
  const [dir, setDir] = useState(0);
  const [filter, setFilter] = useState<Part | null>(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // Follow the selected date into other months (e.g. "今日へ").
  useEffect(() => {
    const m = monthStart(date);
    if (m !== month) {
      setDir(m > month ? 1 : -1);
      setMonth(m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const gridStart = addDays(month, -fromKey(month).getDay());
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const from = [days[0], addDays(today, -27)].sort()[0];
  const to = [days[41], today].sort()[1];
  const summary = useQuery({ queryKey: ["summary", from, to], queryFn: () => api.summary(from, to) });
  const recency = useQuery({
    queryKey: ["summary", "parts", addDays(today, -27), today],
    queryFn: () => api.parts(addDays(today, -27), today),
  });
  const by = useMemo(() => new Map(summary.data?.map((s) => [s.date, s])), [summary.data]);

  const nextMonth = shiftMonth(month, 1);
  const monthDays = (summary.data ?? []).filter((s) => s.date >= month && s.date < nextMonth && s.parts.length).length;
  const sumVolume = (n: number) =>
    (summary.data ?? []).filter((s) => s.date > addDays(today, -n) && s.date <= today).reduce((a, s) => a + (s.volume ?? 0), 0) / 1000;

  // Drop trailing all-next-month week; when collapsed show only the selected (or first) week.
  const rows = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7)).filter((w) => w[0] < nextMonth);
  const selRow = Math.max(0, rows.findIndex((w) => w.includes(date)));
  const visible = collapsed ? [rows[selRow]] : rows;

  const go = (n: number) => {
    haptic(6);
    setDir(n);
    setMonth((m) => shiftMonth(m, n));
  };
  const toggle = () => {
    haptic(5);
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };
  const d = fromKey(month);

  return (
    <motion.section
      className="cal glass"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      aria-label="カレンダー"
    >
      <div className="cal-head">
        <button className="icon-btn" onClick={() => go(-1)} aria-label="前の月">
          <ChevronLeft size={20} />
        </button>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={month}
            className="cal-title"
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
          >
            <b>{d.getMonth() + 1}</b>月 <small>{d.getFullYear()}</small>
          </motion.div>
        </AnimatePresence>
        <button className="icon-btn" onClick={() => go(1)} aria-label="次の月">
          <ChevronRight size={20} />
        </button>
        <div className="cal-month-days" aria-label={`今月の実施日数 ${monthDays}日`}>
          <CountUp value={monthDays} />
          <small>日</small>
        </div>
      </div>

      <div className="cal-week">
        {WEEK.map((w, i) => (
          <span key={w} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>
            {w}
          </span>
        ))}
      </div>

      <motion.div layout className="cal-body" transition={{ type: "spring", stiffness: 380, damping: 36 }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={month + (collapsed ? "c" : "")}
            className="cal-grid"
            initial={{ x: dir * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, i) => {
              if (i.offset.x < -50 || i.velocity.x < -500) go(1);
              else if (i.offset.x > 50 || i.velocity.x > 500) go(-1);
            }}
          >
            {visible.flat().map((day, i) => {
              const s = by.get(day);
              return (
                <DayCell
                  key={day}
                  day={day}
                  index={i}
                  s={s}
                  inMonth={day >= month && day < nextMonth}
                  selected={day === date}
                  isToday={day === today}
                  dim={!!filter && !s?.parts.includes(filter)}
                  onPick={() => {
                    haptic(5);
                    onChange(day);
                  }}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <button className="cal-handle" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "月表示に広げる" : "週表示にたたむ"}>
        <motion.span animate={{ rotate: collapsed ? 0 : 180 }} style={{ display: "flex" }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <div className="cal-stats">
        <div>
          <span>7日間の負荷量</span>
          <b>
            <CountUp value={sumVolume(7)} digits={2} />
            <small>t</small>
          </b>
        </div>
        <div>
          <span>28日間の負荷量</span>
          <b>
            <CountUp value={sumVolume(28)} digits={2} />
            <small>t</small>
          </b>
        </div>
      </div>

      <div className="part-recency" role="group" aria-label="部位で絞り込み">
        {PARTS.map((p, i) => {
          const st = recency.data?.find((x) => x.part === p.id);
          const ago = st ? daysBetween(st.last, today) : null;
          const on = filter === p.id;
          return (
            <motion.button
              key={p.id}
              className={`recency ${on ? "on" : ""}`}
              style={{ ["--pc" as string]: p.color }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptic(5);
                setFilter(on ? null : p.id);
              }}
              aria-pressed={on}
              data-testid="recency"
            >
              <MiniBody parts={[p.id]} size={14} />
              <span className="l">{p.label}</span>
              <span className="a">{ago === null ? "—" : ago === 0 ? "今日" : `${ago}日前`}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
