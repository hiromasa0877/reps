import { motion } from "motion/react";
import { BookOpen, CalendarDays, Check, ChevronsLeft, LogOut, Pencil, Sparkles } from "lucide-react";
import type { User } from "../api";

const GUIDE = [
  { icon: <Check size={16} strokeWidth={3} />, color: "#22c55e", text: "＋ で追加した種目はそのまま記録（完了）になります" },
  { icon: <CalendarDays size={16} />, color: "#0a84ff", text: "カレンダーの人のイラストで、その日に鍛えた部位が分かります" },
  { icon: <ChevronsLeft size={17} />, color: "#ff3b30", text: "左にスワイプで削除（直後なら元に戻せます）" },
  { icon: <Pencil size={15} />, color: "#8e96a8", text: "カードをタップで重量・回数・メモを修正" },
  { icon: <BookOpen size={15} />, color: "#ff6b6b", text: "本のアイコン：正しいフォームを図解で確認" },
  { icon: <Sparkles size={16} />, color: "#a855f7", text: "＋ → AI で作成：部位と要望からメニュー生成" },
];

export function ProfileView({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <>
      <motion.header className="topbar glass" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1>設定</h1>
      </motion.header>
      <motion.div className="glass profile" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {user.picture ? (
          <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar">{user.name.slice(0, 1) || "?"}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="n">{user.name}</div>
          <div className="e">{user.email}</div>
        </div>
      </motion.div>
      <motion.div className="glass guide" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {GUIDE.map((g, i) => (
          <motion.div
            key={g.text}
            className="guide-row"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <span className="ic" style={{ background: g.color }}>
              {g.icon}
            </span>
            {g.text}
          </motion.div>
        ))}
      </motion.div>
      <motion.button
        className="secondary danger"
        style={{ marginTop: 16 }}
        onClick={onLogout}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <LogOut size={17} /> ログアウト
      </motion.button>
    </>
  );
}
