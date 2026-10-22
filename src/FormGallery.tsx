import { CATALOG } from "../shared/catalog";
import { FormFigure } from "./components/FormDiagram";

/** Dev-only QA page (/?forms) showing every form animation side by side. */
export function FormGallery() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8 }}>
      {CATALOG.map((e) => (
        <div key={e.name} className="form-stage" style={{ padding: 4 }}>
          <FormFigure exercise={e} size={170} />
          <div style={{ fontSize: 11, fontWeight: 800 }}>{e.name}</div>
        </div>
      ))}
    </div>
  );
}
