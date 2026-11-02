import { Download, X } from "lucide-react";

type ExportArea = "all" | "selected" | "rectangle";
interface Props {
  area: ExportArea;
  rect: { x: number; y: number; width: number; height: number } | null;
  background: string;
  onArea: (area: ExportArea) => void;
  onBackground: (background: string) => void;
  onPickArea: () => void;
  onExport: (type: "json" | "png" | "svg" | "md") => void;
  onClose: () => void;
}

export function ExportDialog(p: Props) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && p.onClose()
      }
    >
      <div
        className="modal export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export"
      >
        <header>
          <div>
            <span className="eyebrow">DECISION MAP STUDIO</span>
            <h2>Export</h2>
          </div>
          <button onClick={p.onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="modal-section export-options">
          <label>
            Area
            <select
              value={p.area}
              onChange={(event) => p.onArea(event.target.value as ExportArea)}
            >
              <option value="all">Entire map</option>
              <option value="selected">Selected elements</option>
              <option value="rectangle">Custom area</option>
            </select>
          </label>
          {p.area === "rectangle" && (
            <div className="export-area-actions">
              <button onClick={p.onPickArea}>Draw area on canvas</button>
              {p.rect && (
                <span>
                  {Math.round(p.rect.width)} × {Math.round(p.rect.height)} px
                  selected
                </span>
              )}
            </div>
          )}
          <label>
            Background
            <select
              value={p.background.startsWith("#") ? "custom" : p.background}
              onChange={(event) =>
                p.onBackground(
                  event.target.value === "custom"
                    ? "#ffffff"
                    : event.target.value,
                )
              }
            >
              <option value="theme">Theme color</option>
              <option value="transparent">Transparent</option>
              <option value="custom">Custom color</option>
            </select>
          </label>
          {p.background.startsWith("#") && (
            <input
              type="color"
              aria-label="Custom background color"
              value={p.background}
              onChange={(event) => p.onBackground(event.target.value)}
            />
          )}
          <p className="hint">
            PNG exports at the highest resolution. SVG remains scalable.
          </p>
          <div className="project-actions">
            <button onClick={() => p.onExport("png")}>
              <Download size={17} /> Export PNG
            </button>
            <button onClick={() => p.onExport("svg")}>
              <Download size={17} /> Export SVG
            </button>
          </div>
        </div>
        <div className="modal-section">
          <h3>Project data</h3>
          <div className="project-actions">
            <button onClick={() => p.onExport("json")}>
              <Download size={17} /> Export JSON
            </button>
            <button onClick={() => p.onExport("md")}>
              <Download size={17} /> Export Markdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
