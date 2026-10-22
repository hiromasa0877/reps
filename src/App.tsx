import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Plus, Settings } from "lucide-react";
import { ApiError, api, haptic, todayKey, type Task } from "./api";
import { AddSheet } from "./components/AddSheet";
import { EditSheet } from "./components/EditSheet";
import { FormSheet } from "./components/FormSheet";
import { Login } from "./components/Login";
import { ProfileView } from "./components/ProfileView";
import { AppSkeleton } from "./components/Skeleton";
import { StatsView } from "./components/StatsView";
import { ToastProvider } from "./components/Toast";
import { TodayView } from "./components/TodayView";

type Tab = "today" | "stats" | "me";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "today", label: "メニュー", icon: <CalendarDays size={21} /> },
  { id: "stats", label: "記録", icon: <BarChart3 size={21} /> },
  { id: "me", label: "設定", icon: <Settings size={21} /> },
];

export function App() {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["config"], queryFn: api.config, staleTime: Infinity });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
  const onLoggedIn = useCallback(() => qc.invalidateQueries({ queryKey: ["me"] }), [qc]);

  if (config.isPending || me.isPending) return <AppSkeleton />;
  if (config.isError || me.isError) {
    return (
      <div className="login">
        <div className="ai-error">接続できませんでした</div>
        <button className="secondary" style={{ maxWidth: 200 }} onClick={() => location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AnimatePresence mode="wait">
        {me.data ? (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Main
              user={me.data}
              onLogout={async () => {
                await api.logout();
                qc.setQueryData(["me"], null);
                // Drop the user's data but keep the live me/config queries the app is observing.
                qc.removeQueries({ predicate: (q) => !["me", "config"].includes(q.queryKey[0] as string) });
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <Login config={config.data} onLoggedIn={onLoggedIn} />
          </motion.div>
        )}
      </AnimatePresence>
    </ToastProvider>
  );
}

function Main({ user, onLogout }: { user: NonNullable<Awaited<ReturnType<typeof api.me>>>; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(todayKey);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [formOf, setFormOf] = useState<Task | null>(null);
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const [prevIndex, setPrevIndex] = useState(tabIndex);
  const dir = tabIndex >= prevIndex ? 1 : -1;

  const go = (t: Tab) => {
    haptic(5);
    setPrevIndex(tabIndex);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <main className="app">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {tab === "today" && <TodayView date={date} onDate={setDate} onOpen={setEditing} onAdd={() => setAdding(true)} onForm={setFormOf} />}
            {tab === "stats" && <StatsView />}
            {tab === "me" && <ProfileView user={user} onLogout={onLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <motion.nav
        className="tabbar"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.1 }}
      >
        <div className="tabs glass" role="tablist">
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => go(t.id)}
              whileTap={{ scale: 0.9 }}
            >
              {tab === t.id && <motion.div layoutId="tab-indicator" className="indicator" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              {t.icon}
              <span className="lbl">{t.label}</span>
            </motion.button>
          ))}
        </div>
        <motion.button
          className="fab"
          aria-label="種目を追加"
          onClick={() => {
            haptic(8);
            if (tab !== "today") go("today");
            setAdding(true);
          }}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          animate={{ rotate: adding ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Plus size={28} strokeWidth={2.6} />
        </motion.button>
      </motion.nav>

      <AddSheet open={adding} date={date} onClose={() => setAdding(false)} />
      <EditSheet task={editing} onClose={() => setEditing(null)} />
      <FormSheet task={formOf} onClose={() => setFormOf(null)} />
    </>
  );
}
