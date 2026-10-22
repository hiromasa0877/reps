import { BookOpen } from "lucide-react";
import { findExercise } from "../../shared/catalog";
import type { Task } from "../api";
import { FormGuide } from "./FormDiagram";
import { Sheet } from "./Sheet";

export function FormSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const exercise = task ? findExercise(task.name) : undefined;
  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      label="フォーム"
      title={
        <>
          <BookOpen size={20} /> {exercise?.name ?? task?.name}
        </>
      }
    >
      {exercise ? <FormGuide exercise={exercise} /> : <div className="no-form">この種目の図解はまだありません</div>}
      <button className="secondary" onClick={onClose} style={{ marginTop: 16 }}>
        閉じる
      </button>
    </Sheet>
  );
}
