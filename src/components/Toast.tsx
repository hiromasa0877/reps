import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type ToastData = { id: number; text: string; action?: { label: string; run: () => void } };
type Show = (text: string, action?: ToastData["action"]) => void;

const ToastContext = createContext<Show>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<Show>((text, action) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, text, action });
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), action ? 4000 : 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 12, scale: 0.95, x: "-50%" }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          >
            {toast.text}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
