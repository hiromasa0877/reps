import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";

type Props = { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; label: string };

/** Bottom sheet: drag the handle/title down (or tap the scrim, or Esc) to dismiss. */
export function Sheet({ open, onClose, title, children, label }: Props) {
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet glass"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}>
              <i />
            </div>
            <div className="sheet-body">
              <div className="sheet-title" onPointerDown={(e) => controls.start(e)} style={{ touchAction: "none" }}>
                {title}
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
