import {
  BringToFront,
  ChevronDown,
  ChevronUp,
  Copy,
  Focus,
  Grid2X2,
  Hand,
  ImagePlus,
  Link2,
  Maximize,
  MousePointer2,
  PenTool,
  Eraser,
  Plus,
  Redo2,
  Save,
  Search,
  Trash2,
  Undo2,
  WandSparkles,
  ArrowRight,
  Minus,
  Images,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import type { MapDocument } from "../types";

interface Props {
  doc: MapDocument;
  mode: "select" | "connect" | "pan" | "draw" | "erase";
  setMode: (mode: "select" | "connect" | "pan" | "draw" | "erase") => void;
  locked: boolean;
  drawColor: string;
  drawWidth: number;
  setDrawColor: (color: string) => void;
  setDrawWidth: (width: number) => void;
  selectedCount: number;
  hasSelectedEdge: boolean;
  onAdd: () => void;
  onText: () => void;
  onArrow: () => void;
  onLine: () => void;
  onNote: () => void;
  onImage: (file: File) => void;
  imageAssets: { id: string; name: string; src: string }[];
  onReuseImage: (id: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFit: () => void;
  onLayout: () => void;
  onExport: () => void;
  onProjects: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onHide: () => void;
  search: string;
  setSearch: (value: string) => void;
  onFind: () => void;
}

export function Toolbar(p: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  return (
    <header className="topbar unified-toolbar">
      <div className="brand" onClick={p.onProjects} title="Projects">
        <span className="brand-logo">◇</span>
        <span>
          <b>Decision Map</b>
          <small>STUDIO</small>
        </span>
        <ChevronDown size={14} />
      </div>
      <div className="project-name">
        {p.doc.name}
        <span>Automatic local save</span>
      </div>
      <nav className="toolbar-actions" aria-label="Tools">
        <div className="tool-group">
          <button
            className={p.mode === "select" ? "active" : ""}
            onClick={() => p.setMode("select")}
            title="Select (V)"
          >
            <MousePointer2 size={18} />
            <span>Select</span>
          </button>
          <button
            className={p.mode === "pan" ? "active" : ""}
            onClick={() => p.setMode("pan")}
            title="Pan canvas (H)"
          >
            <Hand size={18} />
            <span>Hand</span>
          </button>
          <button
            className={p.mode === "connect" ? "active" : ""}
            disabled={p.locked}
            onClick={() => p.setMode("connect")}
            title="Connect two nodes (C)"
          >
            <Link2 size={18} />
            <span>Connect</span>
          </button>
          <button
            className={p.mode === "draw" ? "active" : ""}
            disabled={p.locked}
            onClick={() => p.setMode("draw")}
            title="Freehand drawing (D)"
          >
            <PenTool size={18} />
            <span>Draw</span>
          </button>
          <button
            className={p.mode === "erase" ? "active" : ""}
            disabled={p.locked}
            onClick={() => p.setMode("erase")}
            title="Erase freehand drawing (E)"
          >
            <Eraser size={18} />
            <span>Eraser</span>
          </button>
          <button onClick={p.onAdd} disabled={p.locked} title="New node (N)">
            <Plus size={18} />
            <span>Node</span>
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={p.onText}
            disabled={p.locked}
            title="Add text"
          >
            <span className="text-icon">T</span>
            <span>Text</span>
          </button>
          <button onClick={p.onArrow} disabled={p.locked} title="Add arrow">
            <ArrowRight size={20} />
            <span>Arrow</span>
          </button>
          <button
            onClick={p.onLine}
            disabled={p.locked}
            title="Add editable line"
          >
            <Minus size={20} />
            <span>Line</span>
          </button>
          <button
            onClick={p.onNote}
            disabled={p.locked}
            title="Add sticky note"
          >
            <StickyNote size={20} />
            <span>Note</span>
          </button>
          <label
            className={`toolbar-image-upload ${p.locked ? "disabled" : ""}`}
            title="Upload image"
          >
            <ImagePlus size={18} />
            <span>Image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={p.locked}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) p.onImage(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <div className="image-library-menu">
            <button
              onClick={() => setLibraryOpen((open) => !open)}
              disabled={p.locked}
              title="Reusable image library"
            >
              <Images size={18} />
              <span>Library</span>
            </button>
            {libraryOpen && (
              <div className="image-library-popover">
                <b>Saved images</b>
                {p.imageAssets.length ? (
                  <div className="image-library-grid">
                    {p.imageAssets.map((asset) => (
                      <button
                        key={asset.id}
                        title={asset.name}
                        onClick={() => {
                          p.onReuseImage(asset.id);
                          setLibraryOpen(false);
                        }}
                      >
                        <img src={asset.src} alt={asset.name} />
                        <span>{asset.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <small>Upload an image to save it here.</small>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="tool-divider" />
        <div className="tool-group compact">
          <button
            onClick={p.onDuplicate}
            disabled={p.locked}
            title="Duplicate (⌘D)"
          >
            <Copy size={17} />
          </button>
          <button
            className={p.selectedCount > 1 ? "selection-delete-ready" : ""}
            onClick={p.onDelete}
            disabled={p.locked || (!p.selectedCount && !p.hasSelectedEdge)}
            title={
              p.selectedCount > 1
                ? `Delete ${p.selectedCount} selected nodes (Delete)`
                : "Delete selection (Delete)"
            }
          >
            <Trash2 size={17} />
            {p.selectedCount > 1 && (
              <em className="selection-count">{p.selectedCount}</em>
            )}
          </button>
          <button
            onClick={p.onUndo}
            disabled={p.locked || !p.canUndo}
            title="Undo (⌘Z)"
          >
            <Undo2 size={17} />
          </button>
          <button
            onClick={p.onRedo}
            disabled={p.locked || !p.canRedo}
            title="Redo (⌘⇧Z)"
          >
            <Redo2 size={17} />
          </button>
        </div>
        <div className="tool-divider" />
        <div className="tool-group compact">
          <button onClick={p.onFit} title="Zoom to Fit">
            <Focus size={17} />
          </button>
          <button onClick={p.onLayout} disabled={p.locked} title="Auto Layout">
            <WandSparkles size={17} />
          </button>
          <button
            className={p.doc.settings.grid ? "subtle-active" : ""}
            disabled={p.locked}
            aria-pressed={p.doc.settings.grid}
            onClick={p.onToggleGrid}
            title="Show or hide grid"
          >
            <Grid2X2 size={17} />
          </button>
          <button
            className={p.doc.settings.snap ? "subtle-active" : ""}
            disabled={p.locked}
            aria-pressed={p.doc.settings.snap}
            onClick={p.onToggleSnap}
            title="Snap nodes to grid while moving"
          >
            <Maximize size={17} />
          </button>
        </div>
      </nav>
      <div className="search-box">
        <Search size={15} />
        <input
          value={p.search}
          onChange={(e) => p.setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && p.onFind()}
          placeholder="Search map"
        />
        <button onClick={p.onFind} title="Find">
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="top-actions">
        <button onClick={p.onProjects} title="Manage projects">
          <BringToFront size={17} />
          <span>Projects</span>
        </button>
        <button onClick={p.onExport} title="Save and export">
          <Save size={17} />
          <span>Export</span>
        </button>
        <button
          className="chrome-hide-button"
          onClick={p.onHide}
          title="Hide bars"
        >
          <ChevronUp size={17} />
          <span>Hide</span>
        </button>
      </div>
    </header>
  );
}
