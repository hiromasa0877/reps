import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Dumbbell } from "lucide-react";
import { WEEKDAYS, addDays, fromKey, todayKey, type Task } from "../api";
import { MonthCalendar } from "./MonthCalendar";
import { useTasks } from "../useTasks";
import { CardSkeletons } from "./Skeleton";
import { SwipeHint, TaskCard } from "./TaskCard";

/** Day total: exercises logged and load, with a pop when it changes. */
function DayTotal({ count, volume }: { count: number; volume: number }) {
  return (
    <div className="day-total" aria-label={`${count}種目 ${volume}kg`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b key={count} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}>
          {count}
        </motion.b>
      </AnimatePresence>
      <span>種目</span>
      {volume > 0 && <small>{volume >= 1000 ? `${(volume / 1000).toFixed(2)}t` : `${volume}kg`}</small>}
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
  const { query, remove } = useTasks(date);
  const tasks = query.data;
  const today = todayKey();
  const d = fromKey(date);

  const total = tasks?.length ?? 0;
  const volume = (tasks ?? []).reduce((a, t) => a + t.sets * t.reps * t.weight, 0);
  const rel = date === today ? "今日" : date === addDays(today, -1) ? "昨日" : date === addDays(today, 1) ? "明日" : null;


  return (
    <>
      <MonthCalendar date={date} onChange={onDate} />
      <motion.header
        className="topbar glass day-bar"
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
          <DayTotal count={total} volume={volume} />
        </div>
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
                {(tasks ?? []).map((t, i) => (
                  <TaskCard key={t.id} task={t} index={i} onDelete={() => remove(t)} onOpen={() => onOpen(t)} onForm={() => onForm(t)} />
                ))}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
        </>
      )}
    </>
  );
}
