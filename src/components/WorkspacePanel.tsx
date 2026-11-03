import { useState } from "react";
import type { MapDocument, NodeStyle } from "../types";
import type { SavedNodeStyle } from "../lib/storage";

type Tab = "layers" | "history" | "settings";
interface Props {
  tab: Tab;
  doc: MapDocument;
  history: MapDocument[];
  selectedIds: string[];
  selectedEdgeIds: string[];
  savedAt: string | null;
  memoryError: string;
  onClose: () => void;
  onSelect: (ids: string[], edge: string | null) => void;
  onReorder: (kind: "node" | "edge", id: string, delta: number) => void;
  onAlign: (kind: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onLock: (kind: "node" | "edge", id: string) => void;
  onJump: (index: number) => void;
  onDefaults: (patch: Partial<NodeStyle>) => void;
  savedStyles: SavedNodeStyle[];
  onSaveStyle: (name: string) => void;
  onUseStyle: (id: string) => void;
  onApplyStyle: (id: string) => void;
  onDeleteStyle: (id: string) => void;
  onRecover: () => void;
}
export function WorkspacePanel(p: Props) {
  const defaults = p.doc.settings.defaults ?? {};
  const [styleName, setStyleName] = useState("");
  const selectedNode = p.doc.nodes.find((node) => node.id === p.selectedIds[0]);
  return (
    <aside className="workspace-panel">
      <header>
        <h2>
          {
            {
              layers: "Layers",
              history: "History",
              settings: "Defaults",
            }[p.tab]
          }
        </h2>
        <button onClick={p.onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className="workspace-panel-body">
        {p.tab === "layers" && (
          <>
            <h3>Nodes and shapes</h3>
            {[...p.doc.nodes].reverse().map((n) => (
              <div
                className={`layer-row ${p.selectedIds.includes(n.id) ? "active" : ""}`}
                key={n.id}
              >
                <button
                  className="layer-title"
                  onClick={() => p.onSelect([n.id], null)}
                  title={n.title}
                >
                  {n.title || n.lineLabel || n.style.shape}
                </button>
                <button
                  onClick={() => p.onLock("node", n.id)}
                  title={n.locked ? "Unlock" : "Lock"}
                >
                  {n.locked ? "🔒" : "🔓"}
                </button>
                <button
                  onClick={() => p.onReorder("node", n.id, 1)}
                  title="Forward"
                >
                  ↑
                </button>
                <button
                  onClick={() => p.onReorder("node", n.id, -1)}
                  title="Backward"
                >
                  ↓
                </button>
              </div>
            ))}
            <h3>Connections</h3>
            {[...p.doc.nodes]
              .filter((n) => n.parentId)
              .reverse()
              .map((n) => (
                <div
                  className={`layer-row ${p.selectedEdgeIds.includes(`tree-${n.id}`) ? "active" : ""}`}
                  key={`tree-${n.id}`}
                >
                  <button
                    className="layer-title"
                    onClick={() => p.onSelect([], `tree-${n.id}`)}
                  >
                    {p.doc.nodes.find((parent) => parent.id === n.parentId)
                      ?.title || "Node"}{" "}
                    → {n.title || "Node"}
                  </button>
                  <button
                    onClick={() => p.onLock("edge", `tree-${n.id}`)}
                    title={n.parentLineLocked ? "Unlock" : "Lock"}
                  >
                    {n.parentLineLocked ? "🔒" : "🔓"}
                  </button>
                  <button
                    onClick={() => p.onReorder("edge", `tree-${n.id}`, 1)}
                    title="Forward"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => p.onReorder("edge", `tree-${n.id}`, -1)}
                    title="Backward"
                  >
                    ↓
                  </button>
                </div>
              ))}
            {[...p.doc.links].reverse().map((e) => (
              <div
                className={`layer-row ${p.selectedEdgeIds.includes(e.id) ? "active" : ""}`}
                key={e.id}
              >
                <button
                  className="layer-title"
                  onClick={() => p.onSelect([], e.id)}
                >
                  {e.label ||
                    `${p.doc.nodes.find((n) => n.id === e.source)?.title || "Node"} → ${p.doc.nodes.find((n) => n.id === e.target)?.title || "Node"}`}
                </button>
                <button
                  onClick={() => p.onLock("edge", e.id)}
                  title={e.locked ? "Unlock" : "Lock"}
                >
                  {e.locked ? "🔒" : "🔓"}
                </button>
                <button onClick={() => p.onReorder("edge", e.id, 1)}>↑</button>
                <button onClick={() => p.onReorder("edge", e.id, -1)}>↓</button>
              </div>
            ))}
            <h3>Arrange selection</h3>
            <div className="workspace-grid">
              {[
                ["left", "Left"],
                ["centerX", "Center X"],
                ["right", "Right"],
                ["top", "Top"],
                ["centerY", "Center Y"],
                ["bottom", "Bottom"],
                ["distributeX", "Space X"],
                ["distributeY", "Space Y"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => p.onAlign(key)}
                  disabled={p.selectedIds.length < 2}
                >
                  {label}
                </button>
              ))}
              <button disabled={p.selectedIds.length < 2} onClick={p.onGroup}>
                Group
              </button>
              <button
                disabled={!selectedNode?.groupId}
                onClick={p.onUngroup}
              >
                Ungroup
              </button>
            </div>
          </>
        )}
        {p.tab === "history" && (
          <>
            <p>
              Choose a saved step to restore it. Undo and redo remain available.
            </p>
            {p.history.map((h, i) => (
              <button
                className={`history-row ${i === p.history.length - 1 ? "active" : ""}`}
                key={`${i}-${h.updatedAt}`}
                onClick={() => p.onJump(i)}
              >
                <span>
                  {i === p.history.length - 1 ? "Current" : "Step " + (i + 1)}
                </span>
                <small>{new Date(h.updatedAt).toLocaleTimeString()}</small>
              </button>
            ))}
            <p>Last saved: {p.savedAt ?? "pending"}</p>
            <button onClick={p.onRecover}>Restore recovery copy</button>
            {p.memoryError && <p className="error">{p.memoryError}</p>}
          </>
        )}
        {p.tab === "settings" && (
          <>
            <p>Applied to newly created nodes.</p>
            <h3>Saved styles</h3>
            <p>
              Save a selected node's look, then use it for new nodes with one
              click.
            </p>
            <div className="saved-style-create">
              <input
                aria-label="Style name"
                placeholder="Style name"
                value={styleName}
                onChange={(event) => setStyleName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && selectedNode) {
                    p.onSaveStyle(styleName);
                    setStyleName("");
                  }
                }}
              />
              <button
                disabled={!selectedNode}
                title={
                  selectedNode
                    ? "Save selected node style"
                    : "Select a node first"
                }
                onClick={() => {
                  p.onSaveStyle(styleName);
                  setStyleName("");
                }}
              >
                Save
              </button>
            </div>
            <div className="saved-style-list">
              {p.savedStyles.map((saved) => (
                <div className="saved-style-row" key={saved.id}>
                  <span
                    className="saved-style-swatch"
                    style={{
                      background: saved.style.background,
                      borderColor: saved.style.borderColor,
                      borderWidth: Math.max(1, saved.style.borderWidth),
                      borderRadius: saved.style.shape === "ellipse" ? "50%" : 7,
                    }}
                  />
                  <strong title={saved.name}>{saved.name}</strong>
                  {p.doc.settings.savedStyleId === saved.id && (
                    <small>Default</small>
                  )}
                  <button
                    onClick={() => p.onUseStyle(saved.id)}
                    title={`Use ${saved.name} for new nodes`}
                  >
                    Use
                  </button>
                  <button
                    disabled={!p.selectedIds.length}
                    onClick={() => p.onApplyStyle(saved.id)}
                    title={`Apply ${saved.name} to selection`}
                  >
                    Apply
                  </button>
                  <button
                    className="saved-style-delete"
                    onClick={() => p.onDeleteStyle(saved.id)}
                    aria-label={`Delete saved style ${saved.name}`}
                    title="Delete saved style"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!p.savedStyles.length && <p>No saved styles yet.</p>}
            </div>
            <h3>Custom defaults</h3>
            <label>
              Font
              <select
                value={defaults.fontFamily ?? "Bodoni Moda, Georgia, serif"}
                onChange={(e) => p.onDefaults({ fontFamily: e.target.value })}
              >
                <option value="Bodoni Moda, Georgia, serif">Bodoni Moda</option>
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="Cheri, cursive">Cheri</option>
                <option value="Super Waffles, sans-serif">Super Waffles</option>
                <option value="Delicious Handrawn, cursive">
                  Delicious Handrawn
                </option>
              </select>
            </label>
            <label>
              Shape
              <select
                value={defaults.shape ?? "rounded"}
                onChange={(e) =>
                  p.onDefaults({ shape: e.target.value as NodeStyle["shape"] })
                }
              >
                {["rectangle", "rounded", "diamond", "triangle", "ellipse"].map(
                  (shape) => (
                    <option key={shape}>{shape}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Fill
              <input
                type="color"
                value={defaults.background ?? "#ffffff"}
                onChange={(e) => p.onDefaults({ background: e.target.value })}
              />
            </label>
            <label>
              Border
              <input
                type="color"
                value={defaults.borderColor ?? "#8996b6"}
                onChange={(e) => p.onDefaults({ borderColor: e.target.value })}
              />
            </label>
            <label>
              Text
              <input
                type="color"
                value={defaults.textColor ?? "#25304a"}
                onChange={(e) => p.onDefaults({ textColor: e.target.value })}
              />
            </label>
            <label>
              Border thickness{" "}
              <input
                type="range"
                min="0"
                max="20"
                value={defaults.borderWidth ?? 2}
                onChange={(e) =>
                  p.onDefaults({ borderWidth: Number(e.target.value) })
                }
              />
              {defaults.borderWidth ?? 2}px
            </label>
          </>
        )}
      </div>
    </aside>
  );
}
