import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Dumbbell, Wrench } from "lucide-react";
import { api, type Config } from "../api";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGis() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function Login({ config, onLoggedIn }: { config: Config; onLoggedIn: () => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (!config.googleClientId) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !slot.current) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          ux_mode: "popup",
          callback: async ({ credential }: { credential: string }) => {
            try {
              await api.loginGoogle(credential);
              onLoggedIn();
            } catch {
              setError("ログインに失敗しました");
            }
          },
        });
        window.google.accounts.id.renderButton(slot.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "ja",
          width: Math.min(320, slot.current.clientWidth || 320),
        });
        setGisReady(true);
      })
      .catch(() => setError("Google ログインを読み込めませんでした"));
    return () => {
      cancelled = true;
    };
  }, [config.googleClientId, onLoggedIn]);

  return (
    <div className="login">
      <motion.div
        className="logo glass"
        initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <motion.div
          animate={{ rotate: [0, -12, 12, 0] }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeInOut" }}
        >
          <Dumbbell size={44} strokeWidth={2.4} />
        </motion.div>
      </motion.div>
      <motion.div
        className="wordmark"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Reps
      </motion.div>
      <motion.div
        className="login-card glass"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 28 }}
      >
        {config.googleClientId && (
          <div className="google-slot" ref={slot}>
            {!gisReady && <div className="sk" style={{ width: 280, height: 44, borderRadius: 99 }} />}
          </div>
        )}
        {config.devLogin && (
          <button
            className="secondary"
            style={{ marginTop: 0 }}
            onClick={async () => {
              await api.loginDev();
              onLoggedIn();
            }}
          >
            <Wrench size={16} /> 開発用ログイン
          </button>
        )}
        {!config.googleClientId && !config.devLogin && (
          <div className="ai-error">GOOGLE_CLIENT_ID が未設定です</div>
        )}
        {error && <div className="ai-error">{error}</div>}
      </motion.div>
    </div>
  );
}
