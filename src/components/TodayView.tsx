import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { WEEKDAYS, addDays, api, fromKey, haptic, todayKey, type Task } from "../api";
import { STATUS_META, STATUS_ORDER, nextStatus, prevStatus, useTasks } from "../useTasks";
import { CardSkeletons } from "./Skeleton";
import { SwipeHint, TaskCard } from "./TaskCard";

function weekStart(key: string) {
  const d = fromKey(key).getDay();
  return addDays(key, -((d + 6) % 7)); // Monday
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 0;
  const complete = total > 0 && done === total;
  return (
    <motion.div
      className="ring"
      aria-label={`${done} / ${total} 完了`}
      animate={complete ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(15,20,40,.08)" strokeWidth="6" />
        <motion.circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke={complete ? "#22c55e" : "#0b0d12"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p), stroke: complete ? "#22c55e" : "#0b0d12" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </svg>
      <div className="num">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={`${done}/${total}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
          >
            {done}/{total}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DateStrip({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const start = weekStart(date);
  const [dir, setDir] = useState(0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const summary = useQuery({
    queryKey: ["summary", days[0], days[6]],
    queryFn: () => api.summary(days[0], days[6]),
  });
  const byDate = new Map(summary.data?.map((s) => [s.date, s]));
  const today = todayKey();

  const shift = (n: number) => {
    setDir(n);
    haptic(6);
    onChange(addDays(date, n * 7));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 14, marginInline: -8 }}>
      <button className="icon-btn" style={{ width: 28 }} onClick={() => shift(-1)} aria-label="前の週">
        <ChevronLeft size={18} />
      </button>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={start}
            className="dates"
            style={{ marginTop: 0 }}
            custom={dir}
            initial={{ x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, i) => {
              if (i.offset.x < -50) shift(1);
              else if (i.offset.x > 50) shift(-1);
            }}
          >
            {days.map((d) => {
              const wd = fromKey(d).getDay();
              const s = byDate.get(d);
              const active = d === date;
              return (
                <motion.button
                  key={d}
                  className={`date ${active ? "active" : ""} ${d === today ? "today" : ""} ${wd === 0 ? "sun" : wd === 6 ? "sat" : ""}`}
                  onClick={() => {
                    haptic(5);
                    onChange(d);
                  }}
                  whileTap={{ scale: 0.9 }}
                  aria-pressed={active}
                  aria-label={d}
                >
                  {active && (
                    <motion.div
                      layoutId="date-pill"
                      className="pill"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="wd">{WEEKDAYS[wd]}</span>
                  <span className="d">{fromKey(d).getDate()}</span>
                  <span className={`dot ${s && s.total ? (s.done === s.total ? "all" : "some") : ""}`} />
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      <button className="icon-btn" style={{ width: 28 }} onClick={() => shift(1)} aria-label="次の週">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function TodayView({
  date,
  onDate,
  onOpen,
  onAdd,
  onForm,
}: {
  date: string;
  onDate: (d: string) => void;
  onOpen: (t: Task) => void;
  onForm: (t: Task) => void;
  onAdd: () => void;
}) {
  const { query, setStatus, setDoneSets, remove } = useTasks(date);
  const tasks = query.data;
  const today = todayKey();
  const d = fromKey(date);

  const groups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: (tasks ?? []).filter((t) => t.status === status),
      })).filter((g) => g.items.length),
    [tasks],
  );
  const done = tasks?.filter((t) => t.status === "done").length ?? 0;
  const total = tasks?.length ?? 0;
  const rel = date === today ? "今日" : date === addDays(today, -1) ? "昨日" : date === addDays(today, 1) ? "明日" : null;

  let index = 0;

  return (
    <>
      <motion.header
        className="topbar glass"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="topbar-row">
          <div className="grow">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                <h1>{rel ?? `${d.getMonth() + 1}月${d.getDate()}日`}</h1>
                <div className="sub">
                  {d.getMonth() + 1}月{d.getDate()}日（{WEEKDAYS[d.getDay()]}）
                  {date !== today && (
                    <button
                      onClick={() => onDate(today)}
                      style={{ marginLeft: 8, color: "var(--blue)", fontWeight: 800, fontSize: 13 }}
                    >
                      今日へ
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <ProgressRing done={done} total={total} />
        </div>
        <DateStrip date={date} onChange={onDate} />
      </motion.header>

      {query.isPending ? (
        <CardSkeletons />
      ) : total === 0 ? (
        <motion.div className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.button
            className="ico glass"
            onClick={onAdd}
            aria-label="種目を追加"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <Dumbbell size={30} />
          </motion.button>
          <div className="t">メニューがありません</div>
          <div className="s">＋ から種目を追加</div>
        </motion.div>
      ) : (
        <>
          <SwipeHint />
          <LayoutGroup>
            <ul className="list">
              <AnimatePresence initial={true}>
                {groups.flatMap((g) => [
                  <motion.li
                    layout="position"
                    key={`h-${g.status}`}
                    className="section-head"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="chip" style={{ background: STATUS_META[g.status].color }} />
                    {STATUS_META[g.status].label}
                    <span className="count">{g.items.length}</span>
                  </motion.li>,
                  ...g.items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      index={index++}
                      onAdvance={() => nextStatus(t.status) && setStatus(t, nextStatus(t.status)!)}
                      onBack={() => prevStatus(t.status) && setStatus(t, prevStatus(t.status)!)}
                      onDelete={() => remove(t)}
                      onSets={(n) => setDoneSets(t, n)}
                      onOpen={() => onOpen(t)}
                      onForm={() => onForm(t)}
                    />
                  )),
                ])}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
        </>
      )}
    </>
  );
}
