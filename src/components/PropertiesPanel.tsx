import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Copy,
  PanelRightClose,
  Palette,
  Trash2,
} from "lucide-react";
import type {
  ArtStyle,
  DarkTheme,
  LineAnimation,
  MapDocument,
  MapLink,
  MapNode,
  MapStroke,
  NodeStyle,
  StrokeStyle,
} from "../types";
import { descendants } from "../lib/tree";
import { resolveLineAnimation } from "../lib/lineAnimation";
import { lineStrokeStyle } from "../lib/stroke";
import {
  ART_STYLE_PRESETS,
  artBackgroundImage,
  normalizeArtStyle,
  patternColorFor,
  type PatternStyle,
} from "../artStyles";
import { DARK_THEME_PRESETS, darkPalette } from "../themePresets";
const colors = [
  "#ffffff",
  "#e4eaff",
  "#dff6e9",
  "#fff0cf",
  "#ffe1e1",
  "#e8ddff",
];
const fonts = [
  "Inter, system-ui, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Verdana, sans-serif",
  "Courier New, monospace",
  "Chalkboard SE, Bradley Hand, Marker Felt, cursive",
  "Delicious Handrawn, cursive",
  "Bodoni Moda, Georgia, serif",
  "Super Waffles, sans-serif",
  "Cheri, cursive",
];
interface Props {
  doc: MapDocument;
  locked: boolean;
  stroke: MapStroke | null;
  onStroke: (id: string, patch: Partial<MapStroke>) => void;
  node: MapNode | null;
  link: MapLink | null;
  treeChild: MapNode | null;
  selectionCount: number;
  selectedEdgeIds: string[];
  onBatchLink: (ids: string[], patch: Partial<MapLink>) => void;
  onApplyLineToAll: (kind: "link" | "tree", id: string) => void;
  onBatchStyle: (patch: Partial<NodeStyle>) => void;
  onDeleteSelection: () => void;
  onNode: (id: string, patch: Partial<MapNode>) => void;
  onStyle: (id: string, patch: Partial<NodeStyle>) => void;
  onLink: (id: string, patch: Partial<MapLink>) => void;
  onClose: () => void;
  onAction: (action: string) => void;
  clipboardStyle: NodeStyle | null;
}
export function PropertiesPanel(p: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    text: true,
    shape: true,
    pattern: true,
    layers: true,
    parent: true,
    style: true,
    connectionLine: true,
    connectionAnimation: true,
  });
  const toggleSection = (key: string) =>
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  if (p.selectionCount > 1)
    return (
      <aside className={p.locked ? "properties read-only" : "properties"}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">PROPERTIES</span>
            <h2>Multiple selection</h2>
          </div>
          <button onClick={p.onClose} title="Close panel">
            <PanelRightClose size={19} />
          </button>
        </div>
        <div className="panel-body">
          <p className="hint">
            {p.selectionCount} nodes selected. Move, resize and format them
            together.
          </p>
          <ColorField
            label="Fill"
            value={p.node?.style.background ?? "#ffffff"}
            change={(background) => p.onBatchStyle({ background })}
          />
          <ColorField
            label="Border"
            value={p.node?.style.borderColor ?? "#8996b6"}
            change={(borderColor) => p.onBatchStyle({ borderColor })}
          />
          <ColorField
            label="Text"
            value={p.node?.style.textColor ?? "#25304a"}
            change={(textColor) => p.onBatchStyle({ textColor })}
          />
          <div className="field">
            <label>Font</label>
            <select
              value={p.node?.style.fontFamily ?? fonts[0]}
              onChange={(e) => p.onBatchStyle({ fontFamily: e.target.value })}
            >
              {fonts.map((font) => (
                <option key={font} value={font}>
                  {font.split(",")[0]}
                </option>
              ))}
            </select>
          </div>
          <StrokeWidthPicker
            label="Border width"
            value={p.node?.style.borderWidth ?? 2}
            onChange={(borderWidth) => p.onBatchStyle({ borderWidth })}
          />
          <button className="danger" onClick={p.onDeleteSelection}>
            <Trash2 size={15} /> Delete {p.selectionCount} selected nodes
          </button>
        </div>
      </aside>
    );
  if (p.selectedEdgeIds.length > 1) {
    const firstId = p.selectedEdgeIds[0];
    const reference = p.doc.links.find((link) => link.id === firstId);
    const treeNode = firstId.startsWith("tree-")
      ? p.doc.nodes.find((node) => node.id === firstId.slice(5))
      : undefined;
    const color =
      reference?.color ??
      treeNode?.parentLineColor ??
      (p.doc.settings.theme === "dark"
        ? darkPalette(p.doc.settings.darkTheme).edge
        : "#8796bb");
    const width = reference?.width ?? treeNode?.parentLineWidth ?? 4;
    const type = reference?.type ?? treeNode?.parentLineType ?? "default";
    const strokeStyle =
      reference?.strokeStyle ?? treeNode?.parentLineStyle ?? "solid";
    const animation = reference?.animation ?? treeNode?.parentAnimation;
    return (
      <aside className={p.locked ? "properties read-only" : "properties"}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">PROPERTIES</span>
            <h2>{p.selectedEdgeIds.length} connections</h2>
          </div>
          <button onClick={p.onClose} title="Close panel">
            <PanelRightClose size={19} />
          </button>
        </div>
        <div className="panel-body">
          <p className="hint">Changes apply to every selected connection.</p>
          <ColorField
            label="Line color"
            value={color}
            change={(value) =>
              p.onBatchLink(p.selectedEdgeIds, { color: value })
            }
          />
          <StrokeWidthPicker
            label="Line width"
            value={width}
            onChange={(value) =>
              p.onBatchLink(p.selectedEdgeIds, { width: value })
            }
          />
          <div className="field">
            <label>Path</label>
            <select
              value={type}
              onChange={(event) =>
                p.onBatchLink(p.selectedEdgeIds, {
                  type: event.target.value as MapLink["type"],
                })
              }
            >
              <option value="straight">Straight</option>
              <option value="default">Curved</option>
              <option value="smoothstep">Orthogonal</option>
            </select>
          </div>
          <StrokeStylePicker
            label="Line style"
            value={strokeStyle}
            onChange={(value) =>
              p.onBatchLink(p.selectedEdgeIds, {
                strokeStyle: value,
                dashed: value === "dashed",
              })
            }
          />
          <LineAnimationControls
            parent={Boolean(treeNode)}
            value={animation}
            onChange={(value) =>
              p.onBatchLink(p.selectedEdgeIds, { animation: value })
            }
          />
        </div>
      </aside>
    );
  }
  if (p.stroke)
    return (
      <aside className={p.locked ? "properties read-only" : "properties"}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">PROPERTIES</span>
            <h2>Freehand drawing</h2>
          </div>
          <button onClick={p.onClose} title="Close panel">
            <PanelRightClose size={19} />
          </button>
        </div>
        <div className="panel-body">
          <ColorField
            label="Stroke color"
            value={p.stroke.color}
            change={(color) => p.onStroke(p.stroke!.id, { color })}
          />
          <StrokeWidthPicker
            label="Stroke width"
            value={p.stroke.width}
            onChange={(width) => p.onStroke(p.stroke!.id, { width })}
          />
          <button className="danger" onClick={p.onDeleteSelection}>
            <Trash2 size={15} /> Delete stroke
          </button>
        </div>
      </aside>
    );
  if (p.treeChild) {
    const parent = p.doc.nodes.find((n) => n.id === p.treeChild?.parentId);
    const lineColor =
      p.treeChild.parentLineColor ??
      (p.doc.settings.theme === "dark"
        ? darkPalette(p.doc.settings.darkTheme).edge
        : "#8796bb");
    return (
      <aside className={p.locked ? "properties read-only" : "properties"}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">PROPERTIES</span>
            <h2>Connection</h2>
          </div>
          <button onClick={p.onClose} title="Close panel">
            <PanelRightClose size={19} />
          </button>
        </div>
        <div className="panel-body">
          <p className="hint">
            <strong>{parent?.title ?? "Parent"}</strong> →{" "}
            <strong>{p.treeChild.title}</strong>
          </p>
          <section>
            <button
              className="properties-section-toggle"
              onClick={() => toggleSection("connectionLine")}
              aria-expanded={!collapsed.connectionLine}
            >
              <h3>Line</h3>
              <span>{collapsed.connectionLine ? "+" : "−"}</span>
            </button>
            {!collapsed.connectionLine && (
              <div className="properties-section-content">
                <ColorField
                  label="Line color"
                  value={lineColor}
                  change={(value) =>
                    p.onNode(p.treeChild!.id, { parentLineColor: value })
                  }
                />
                <StrokeWidthPicker
                  label="Line width"
                  value={p.treeChild.parentLineWidth ?? 4}
                  onChange={(value) =>
                    p.onNode(p.treeChild!.id, { parentLineWidth: value })
                  }
                />
                <div className="field">
                  <label>Path</label>
                  <select
                    value={p.treeChild.parentLineType ?? "default"}
                    onChange={(e) =>
                      p.onNode(p.treeChild!.id, {
                        parentLineType: e.target
                          .value as MapNode["parentLineType"],
                      })
                    }
                  >
                    <option value="straight">Straight</option>
                    <option value="default">Curved</option>
                    <option value="smoothstep">Orthogonal</option>
                  </select>
                </div>
                <StrokeStylePicker
                  label="Line style"
                  value={p.treeChild.parentLineStyle ?? "solid"}
                  onChange={(value) =>
                    p.onNode(p.treeChild!.id, { parentLineStyle: value })
                  }
                />
              </div>
            )}
          </section>
          <section>
            <button
              className="properties-section-toggle"
              onClick={() => toggleSection("connectionAnimation")}
              aria-expanded={!collapsed.connectionAnimation}
            >
              <h3>Line animation</h3>
              <span>{collapsed.connectionAnimation ? "+" : "−"}</span>
            </button>
            {!collapsed.connectionAnimation && (
              <div className="properties-section-content">
                <LineAnimationControls
                  parent
                  value={p.treeChild.parentAnimation}
                  onChange={(value) =>
                    p.onNode(p.treeChild!.id, { parentAnimation: value })
                  }
                />
                <button type="button" onClick={() => p.onApplyLineToAll("tree", p.treeChild!.id)}>Apply these line settings to all lines</button>
              </div>
            )}
          </section>
          <p className="hint">
            Removing this line makes the child independent. Both nodes remain on
            the canvas.
          </p>
          <button className="danger" onClick={() => p.onAction("deleteEdge")}>
            <Trash2 size={15} /> Remove connection
          </button>
        </div>
      </aside>
    );
  }
  const n = p.node,
    s = n?.style;
  const standaloneLine = s?.shape === "line" || s?.shape === "arrow";
  const style = (patch: Partial<NodeStyle>) => n && p.onStyle(n.id, patch);
  return (
    <aside className={p.locked ? "properties read-only" : "properties"}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">PROPERTIES</span>
          <h2>{n ? "Node" : p.link ? "Connection" : "Canvas"}</h2>
        </div>
        <button onClick={p.onClose} title="Close panel">
          <PanelRightClose size={19} />
        </button>
      </div>
      {n && s ? (
        <div className="panel-body">
          {standaloneLine ? (
            <>
              <div className="field">
                <label>Label</label>
                <input
                  value={n.lineLabel ?? ""}
                  onChange={(e) =>
                    p.onNode(n.id, { lineLabel: e.target.value })
                  }
                  placeholder="Enter a label"
                />
              </div>
              <ColorField
                label="Label color"
                value={n.lineLabelColor ?? "#000000"}
                change={(lineLabelColor) => p.onNode(n.id, { lineLabelColor })}
              />
              <section>
                <button
                  className="properties-section-toggle"
                  onClick={() => toggleSection("lineStyle")}
                  aria-expanded={!collapsed.lineStyle}
                >
                  <h3>Line</h3>
                  <span>{collapsed.lineStyle ? "+" : "−"}</span>
                </button>
                {!collapsed.lineStyle && (
                  <div className="properties-section-content">
                    <ColorField
                      label="Color"
                      value={s.borderColor}
                      change={(color) => style({ borderColor: color })}
                    />
                    <NumberField
                      label="Thickness"
                      value={s.borderWidth}
                      min={1}
                      max={30}
                      change={(v) => style({ borderWidth: v })}
                    />
                    <div className="two-cols">
                      <NumberField
                        label="Width"
                        value={s.width}
                        min={100}
                        max={1000}
                        change={(v) => style({ width: v })}
                      />
                    </div>
                  </div>
                )}
              </section>
              <button className="danger" onClick={() => p.onAction("delete")}>
                <Trash2 size={15} /> Delete element
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <label>Title</label>
                <input
                  value={n.title}
                  onChange={(e) => p.onNode(n.id, { title: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Multiline text</label>
                <textarea
                  value={n.text}
                  onChange={(e) => p.onNode(n.id, { text: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="quick-actions">
                <button onClick={() => p.onAction("child")}>+ Child</button>
                <button onClick={() => p.onAction("sibling")}>+ Sibling</button>
                <button onClick={() => p.onAction("parent")}>+ Parent</button>
              </div>
              {!standaloneLine && (
                <section>
                  <button
                    className="properties-section-toggle"
                    onClick={() => toggleSection("text")}
                    aria-expanded={!collapsed.text}
                  >
                    <h3>Text</h3>
                    <span>{collapsed.text ? "+" : "−"}</span>
                  </button>
                  {!collapsed.text && (
                    <div className="properties-section-content">
                      <div className="field">
                        <label>Font</label>
                        <select
                          value={s.fontFamily}
                          onChange={(e) =>
                            style(
                              e.target.value.startsWith("Bodoni Moda")
                                ? { fontFamily: e.target.value, italic: true }
                                : { fontFamily: e.target.value },
                            )
                          }
                        >
                          {fonts.map((f) => (
                            <option key={f} value={f}>
                              {f.split(",")[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <NumberField
                        label="Size"
                        value={s.fontSize}
                        min={8}
                        max={80}
                        change={(v) => style({ fontSize: v })}
                      />
                      <ColorField
                        label="Text color"
                        value={s.textColor}
                        change={(v) => style({ textColor: v })}
                      />
                      <div className="segmented">
                        <button
                          className={s.bold ? "active" : ""}
                          onClick={() => style({ bold: !s.bold })}
                          title="Bold"
                        >
                          <b>B</b>
                        </button>
                        <button
                          className={s.italic ? "active" : ""}
                          onClick={() => style({ italic: !s.italic })}
                          title="Italic"
                        >
                          <i>I</i>
                        </button>
                        <button
                          className={s.underline ? "active" : ""}
                          onClick={() => style({ underline: !s.underline })}
                          title="Underline"
                        >
                          <u>U</u>
                        </button>
                        <button
                          className={s.textAlign === "left" ? "active" : ""}
                          onClick={() => style({ textAlign: "left" })}
                          title="Align left"
                        >
                          <AlignLeft size={16} />
                        </button>
                        <button
                          className={s.textAlign === "center" ? "active" : ""}
                          onClick={() => style({ textAlign: "center" })}
                          title="Center"
                        >
                          <AlignCenter size={16} />
                        </button>
                        <button
                          className={s.textAlign === "right" ? "active" : ""}
                          onClick={() => style({ textAlign: "right" })}
                          title="Align right"
                        >
                          <AlignRight size={16} />
                        </button>
                      </div>
                      <div className="two-cols">
                        <div className="field">
                          <label>Vertical alignment</label>
                          <select
                            value={s.verticalAlign}
                            onChange={(e) =>
                              style({
                                verticalAlign: e.target
                                  .value as NodeStyle["verticalAlign"],
                              })
                            }
                          >
                            <option value="top">Top</option>
                            <option value="middle">Middle</option>
                            <option value="bottom">Bottom</option>
                          </select>
                        </div>
                        <NumberField
                          label="Padding"
                          value={s.padding}
                          min={0}
                          max={60}
                          change={(v) => style({ padding: v })}
                        />
                      </div>
                    </div>
                  )}
                </section>
              )}
              <section>
                <button
                  className="properties-section-toggle"
                  onClick={() => toggleSection("shape")}
                  aria-expanded={!collapsed.shape}
                >
                  <h3>Shape</h3>
                  <span>{collapsed.shape ? "+" : "−"}</span>
                </button>
                {standaloneLine ? (
                  <div className="properties-section-content">
                    <ColorField
                      label="Color"
                      value={s.borderColor}
                      change={(color) => style({ borderColor: color })}
                    />
                    <NumberField
                      label="Thickness"
                      value={s.borderWidth}
                      min={1}
                      max={30}
                      change={(v) => style({ borderWidth: v })}
                    />
                    <div className="two-cols">
                      <NumberField
                        label="Width"
                        value={s.width}
                        min={100}
                        max={1000}
                        change={(v) => style({ width: v })}
                      />
                      <NumberField
                        label="Height"
                        value={s.height}
                        min={30}
                        max={700}
                        change={(v) => style({ height: v })}
                      />
                    </div>
                  </div>
                ) : (
                  !collapsed.shape && (
                    <div className="properties-section-content">
                      <ShapePicker
                        value={s.shape}
                        onChange={(shape) => style({ shape })}
                      />
                      <ColorField
                        label="Background"
                        value={s.background}
                        change={(v) => style({ background: v })}
                      />
                      <ColorField
                        label="Border"
                        value={s.borderColor}
                        change={(v) => style({ borderColor: v })}
                      />
                      <StrokeStylePicker
                        label="Border style"
                        value={s.strokeStyle ?? "solid"}
                        onChange={(value) => style({ strokeStyle: value })}
                        allowSketch
                      />
                      {standaloneLine ? (
                        <NumberField
                          label="Thickness"
                          value={s.borderWidth}
                          min={1}
                          max={30}
                          change={(v) => style({ borderWidth: v })}
                        />
                      ) : (
                        <StrokeWidthPicker
                          label="Border width"
                          value={s.borderWidth}
                          onChange={(v) => style({ borderWidth: v })}
                        />
                      )}
                      <div className="two-cols">
                        <NumberField
                          label="Corner radius px"
                          value={s.radius}
                          min={0}
                          max={80}
                          change={(v) => style({ radius: v })}
                        />
                        <NumberField
                          label="Width"
                          value={s.width}
                          min={100}
                          max={1000}
                          change={(v) => style({ width: v })}
                        />
                        <NumberField
                          label="Height"
                          value={s.height}
                          min={55}
                          max={700}
                          change={(v) => style({ height: v })}
                        />
                      </div>
                      <div className="field">
                        <label>Opacity {Math.round(s.opacity * 100)}%</label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={Math.round(s.opacity * 100)}
                          onChange={(e) =>
                            style({ opacity: Number(e.target.value) / 100 })
                          }
                        />
                      </div>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={s.shadow}
                          onChange={(e) => style({ shadow: e.target.checked })}
                        />{" "}
                        Shadow
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={s.autoSize}
                          onChange={(e) =>
                            style({ autoSize: e.target.checked })
                          }
                        />{" "}
                        Automatic height from text
                      </label>
                    </div>
                  )
                )}
              </section>
              {!standaloneLine && (
                <section>
                  <button
                    className="properties-section-toggle"
                    onClick={() => toggleSection("pattern")}
                    aria-expanded={!collapsed.pattern}
                  >
                    <h3>Pattern</h3>
                    <span>{collapsed.pattern ? "+" : "−"}</span>
                  </button>
                  {!collapsed.pattern && (
                    <div className="properties-section-content">
                      <ArtStylePicker
                        value={s.artStyle ?? "none"}
                        color={patternColorFor(s.artStyle, s.patternColor)}
                        onChange={(artStyle) =>
                          style({
                            artStyle,
                            patternColor: patternColorFor(
                              s.artStyle,
                              s.patternColor,
                            ),
                          })
                        }
                        onColorChange={(patternColor) =>
                          style({ patternColor })
                        }
                      />
                    </div>
                  )}
                </section>
              )}
              {!standaloneLine && (
                <section>
                  <button
                    className="properties-section-toggle"
                    onClick={() => toggleSection("layers")}
                    aria-expanded={!collapsed.layers}
                  >
                    <h3>Layers</h3>
                    <span>{collapsed.layers ? "+" : "−"}</span>
                  </button>
                  {!collapsed.layers && (
                    <div className="properties-section-content">
                      <div className="quick-actions">
                        <button onClick={() => p.onAction("front")}>
                          Bring to front
                        </button>
                        <button onClick={() => p.onAction("forward")}>
                          Bring forward
                        </button>
                        <button onClick={() => p.onAction("backward")}>
                          Send backward
                        </button>
                        <button onClick={() => p.onAction("back")}>
                          Send to back
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {!standaloneLine && (
                <section>
                  <button
                    className="properties-section-toggle"
                    onClick={() => toggleSection("parent")}
                    aria-expanded={!collapsed.parent}
                  >
                    <h3>Parent</h3>
                    <span>{collapsed.parent ? "+" : "−"}</span>
                  </button>
                  {!collapsed.parent && (
                    <div className="properties-section-content">
                      <div className="field">
                        <label>Parent node</label>
                        <select
                          value={n.parentId ?? "root"}
                          onChange={(e) =>
                            p.onAction(`reparent:${n.id}:${e.target.value}`)
                          }
                        >
                          <option value="root">None (root)</option>
                          {p.doc.nodes
                            .filter(
                              (candidate) =>
                                candidate.id !== n.id &&
                                !descendants(p.doc.nodes, n.id).includes(
                                  candidate.id,
                                ),
                            )
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.title}
                              </option>
                            ))}
                        </select>
                      </div>
                      {n.parentId && (
                        <div className="quick-actions">
                          <button
                            onClick={() => p.onAction(`navigate:${n.parentId}`)}
                          >
                            ↑ Go to parent
                          </button>
                        </div>
                      )}
                      {p.doc.nodes.some((child) => child.parentId === n.id) && (
                        <div className="quick-actions">
                          {p.doc.nodes
                            .filter((child) => child.parentId === n.id)
                            .map((child) => (
                              <button
                                key={child.id}
                                onClick={() =>
                                  p.onAction(`navigate:${child.id}`)
                                }
                              >
                                ↓ {child.title}
                              </button>
                            ))}
                        </div>
                      )}
                      <div className="quick-actions">
                        <button onClick={() => p.onAction("collapse")}>
                          Collapse children
                        </button>
                        <button onClick={() => p.onAction("expand")}>
                          Expand children
                        </button>
                        <button onClick={() => p.onAction("collapseAll")}>
                          Collapse all
                        </button>
                        <button onClick={() => p.onAction("expandAll")}>
                          Expand all
                        </button>
                      </div>
                      <div className="quick-actions">
                        <button onClick={() => p.onAction("duplicateSubtree")}>
                          Duplicate subtree
                        </button>
                        <button onClick={() => p.onAction("deleteSubtree")}>
                          Delete subtree
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
              <section>
                <button
                  className="properties-section-toggle"
                  onClick={() => toggleSection("style")}
                  aria-expanded={!collapsed.style}
                >
                  <h3>Style</h3>
                  <span>{collapsed.style ? "+" : "−"}</span>
                </button>
                {!collapsed.style && (
                  <div className="properties-section-content">
                    <div className="quick-actions">
                      <button onClick={() => p.onAction("copyStyle")}>
                        <Copy size={14} /> Copy style
                      </button>
                      <button
                        disabled={!p.clipboardStyle}
                        onClick={() => p.onAction("pasteStyle")}
                      >
                        Paste style
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <button className="danger" onClick={() => p.onAction("delete")}>
                <Trash2 size={15} /> Delete node (children reattached)
              </button>
            </>
          )}
        </div>
      ) : p.link ? (
        <div className="panel-body">
          <div className="field">
            <label>Label</label>
            <input
              value={p.link.label}
              onChange={(e) => p.onLink(p.link!.id, { label: e.target.value })}
            />
          </div>
          <NumberField
            label="Label size"
            value={p.link.labelFontSize ?? 12}
            min={8}
            max={48}
            change={(v) => p.onLink(p.link!.id, { labelFontSize: v })}
          />
          <ColorField
            label="Label color"
            value={p.link.labelColor ?? p.link.color}
            change={(v) => p.onLink(p.link!.id, { labelColor: v })}
          />
          <ColorField
            label="Line color"
            value={p.link.color}
            change={(v) => p.onLink(p.link!.id, { color: v })}
          />
          <StrokeWidthPicker
            label="Line width"
            value={p.link.width}
            onChange={(v) => p.onLink(p.link!.id, { width: v })}
          />
          <div className="field">
            <label>Path</label>
            <select
              value={p.link.type}
              onChange={(e) =>
                p.onLink(p.link!.id, {
                  type: e.target.value as MapLink["type"],
                })
              }
            >
              <option value="straight">Straight</option>
              <option value="default">Curved</option>
              <option value="smoothstep">Orthogonal</option>
            </select>
          </div>
          <StrokeStylePicker
            label="Line style"
            value={lineStrokeStyle(p.link.strokeStyle, p.link.dashed)}
            onChange={(value) =>
              p.onLink(p.link!.id, {
                strokeStyle: value,
                dashed: value === "dashed",
              })
            }
          />
          <LineAnimationControls
            parent={false}
            value={p.link.animation}
            onChange={(value) => p.onLink(p.link!.id, { animation: value })}
          />
          <button type="button" onClick={() => p.onApplyLineToAll("link", p.link!.id)}>Apply these line settings to all lines</button>
          <div className="field"><label>Start marker</label><select
            value={p.link.markerStart ?? "none"}
            onChange={(e) => p.onLink(p.link!.id, { markerStart: e.target.value as MapLink["markerStart"] })}
          ><option value="none">None</option><option value="arrow">Arrow</option><option value="arrowclosed">Filled arrow</option></select></div>
          <div className="field"><label>End marker</label><select
            value={p.link.markerEnd ?? (p.link.arrow ? "arrowclosed" : "none")}
            onChange={(e) => p.onLink(p.link!.id, { markerEnd: e.target.value as MapLink["markerEnd"], arrow: e.target.value !== "none" })}
          ><option value="none">None</option><option value="arrow">Arrow</option><option value="arrowclosed">Filled arrow</option></select></div>
          {(p.link.markerStart && p.link.markerStart !== "none" || (p.link.markerEnd ?? (p.link.arrow ? "arrowclosed" : "none")) !== "none") && (
            <ColorField
              label="Arrow color"
              value={p.link.arrowColor ?? p.link.color}
              change={(v) => p.onLink(p.link!.id, { arrowColor: v })}
            />
          )}
          <button className="danger" onClick={() => p.onAction("deleteEdge")}>
            Remove connection
          </button>
        </div>
      ) : (
        <div className="panel-body">
          <p className="hint">
            Select a node or line to edit it. Drag from connection points to
            create links.
          </p>
          <section>
            <h3>Layout</h3>
            <div className="field">
              <label>Direction · applied immediately</label>
              <select
                value={p.doc.settings.direction}
                onChange={(e) => p.onAction(`direction:${e.target.value}`)}
              >
                <option value="LR">Left → right</option>
                <option value="TB">Top → bottom</option>
                <option value="RL">Right → left</option>
                <option value="BT">Bottom → top</option>
                <option value="free">Free</option>
              </select>
            </div>
            <p className="hint">
              Direction and spacing immediately rearrange connected nodes.
              “Free” keeps manual positions.
            </p>
            <div className="two-cols">
              <NumberField
                label="Horizontal distance"
                value={p.doc.settings.horizontalGap}
                min={20}
                max={500}
                change={(v) => p.onAction(`horizontalGap:${v}`)}
              />
              <NumberField
                label="Vertical distance"
                value={p.doc.settings.verticalGap}
                min={10}
                max={500}
                change={(v) => p.onAction(`verticalGap:${v}`)}
              />
              <NumberField
                label="Node spacing"
                value={p.doc.settings.nodeGap}
                min={0}
                max={300}
                change={(v) => p.onAction(`nodeGap:${v}`)}
              />
            </div>
          </section>
          <section>
            <h3>View</h3>
            <ThemePicker
              theme={p.doc.settings.theme}
              darkTheme={p.doc.settings.darkTheme}
              onSelect={(value) => p.onAction(`theme:${value}`)}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={p.doc.settings.minimap}
                onChange={() => p.onAction("minimap")}
              />{" "}
              Minimap
            </label>
          </section>
        </div>
      )}
    </aside>
  );
}
function LineAnimationControls({
  value,
  parent,
  onChange,
}: {
  value: LineAnimation | undefined;
  parent: boolean;
  onChange: (value: LineAnimation) => void;
}) {
  const animation = resolveLineAnimation(value, parent);
  return (
    <section className="line-animation-settings">
      <h3>Line animation</h3>
      <div className="field">
        <label>Effect</label>
        <select
          value={animation.mode}
          onChange={(e) =>
            onChange({
              ...animation,
              mode: e.target.value as LineAnimation["mode"],
            })
          }
        >
          <option value="none">Off</option>
          <option value="flow">Flowing lights</option>
          <option value="blink">Blink</option>
          <option value="pulse">Pulse</option>
        </select>
      </div>
      {animation.mode !== "none" && (
        <>
          <ColorField
            label="Animation color"
            value={animation.color}
            change={(color) => onChange({ ...animation, color })}
          />
          <div className="field">
            <label>Speed {animation.speed.toFixed(2)}×</label>
            <input
              type="range"
              min="0.05"
              max="4"
              step="0.05"
              value={animation.speed}
              onChange={(e) =>
                onChange({ ...animation, speed: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label>Duration {animation.duration.toFixed(1)} s</label>
            <input
              type="range"
              min="0.2"
              max="20"
              step="0.1"
              value={animation.duration}
              onChange={(e) =>
                onChange({ ...animation, duration: Number(e.target.value) })
              }
            />
          </div>
          <p className="hint">
            The animation repeats; duration controls each cycle.
          </p>
        </>
      )}
    </section>
  );
}

function ArtStylePicker({
  value,
  color,
  onChange,
  onColorChange,
}: {
  value: ArtStyle;
  color: string;
  onChange: (pattern: PatternStyle) => void;
  onColorChange: (color: string) => void;
}) {
  const selected = normalizeArtStyle(value);
  return (
    <div className="field">
      <label>Pattern</label>
      <div className="art-style-grid">
        {ART_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={selected === preset.id ? "active" : ""}
            aria-pressed={selected === preset.id}
            onClick={() => onChange(preset.id)}
          >
            <span
              className="art-style-swatch"
              style={{
                backgroundColor: "var(--control)",
                backgroundImage: artBackgroundImage(preset.id, "#788098"),
                borderColor: "var(--muted)",
                color: "var(--muted)",
              }}
            >
              {preset.id === "none" ? "—" : ""}
            </span>
            <span>{preset.name}</span>
          </button>
        ))}
        <PatternColorPicker value={color} change={onColorChange} />
      </div>
    </div>
  );
}

function ShapePicker({
  value,
  onChange,
}: {
  value: NodeStyle["shape"];
  onChange: (shape: NodeStyle["shape"]) => void;
}) {
  const shapes: [NodeStyle["shape"], string][] = [
    ["rectangle", "Rectangle"],
    ["rounded", "Rounded"],
    ["diamond", "Diamond"],
    ["triangle", "Triangle"],
    ["line", "Line"],
    ["ellipse", "Ellipse"],
    ["arrow", "Arrow"],
  ];
  return (
    <div className="field">
      <label>Shape</label>
      <div className="shape-picker" role="group" aria-label="Shape">
        {shapes.map(([shape, name]) => (
          <button
            key={shape}
            type="button"
            className={value === shape ? "active" : ""}
            aria-label={name}
            title={name}
            aria-pressed={value === shape}
            onClick={() => onChange(shape)}
          >
            <svg
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {shape === "rectangle" ? (
                <rect x="6" y="6" width="24" height="24" />
              ) : shape === "rounded" ? (
                <rect x="6" y="6" width="24" height="24" rx="7" />
              ) : shape === "diamond" ? (
                <path d="M18 4 32 18 18 32 4 18Z" />
              ) : shape === "triangle" ? (
                <path d="M18 4 33 31H3Z" />
              ) : shape === "arrow" ? (
                <path d="M3 13H22V7L33 18 22 29V23H3Z" />
              ) : shape === "line" ? (
                <path d="M4 25 Q18 8 32 18" />
              ) : (
                <circle cx="18" cy="18" r="13" />
              )}
            </svg>
            <span>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StrokeWidthPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="stroke-width-picker" role="group" aria-label={label}>
        {[1, 2, 3, 4, 6].map((width) => (
          <button
            key={width}
            type="button"
            className={value === width ? "active" : ""}
            title={`${width} px`}
            aria-label={`${width} px`}
            aria-pressed={value === width}
            onClick={() => onChange(width)}
          >
            <span style={{ height: width }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function StrokeStylePicker({
  label,
  value,
  onChange,
  allowSketch = false,
}: {
  label: string;
  value: StrokeStyle;
  onChange: (value: StrokeStyle) => void;
  allowSketch?: boolean;
}) {
  const options: [StrokeStyle, string][] = [
    ["solid", "Solid"],
    ["dashed", "Dashed"],
    ["dotted", "Dotted"],
  ];
  if (allowSketch) options.push(["sketch", "Rough pencil"]);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="stroke-style-picker" role="group" aria-label={label}>
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            className={value === id ? "active" : ""}
            title={name}
            aria-label={name}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            <span className={`stroke-style-sample ${id}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemePicker({
  theme,
  darkTheme,
  onSelect,
}: {
  theme: "light" | "dark";
  darkTheme?: DarkTheme;
  onSelect: (value: DarkTheme | "light") => void;
}) {
  return (
    <div className="field">
      <label>Theme</label>
      <div className="theme-preset-grid">
        <button
          type="button"
          className={theme === "light" ? "active" : ""}
          aria-pressed={theme === "light"}
          onClick={() => onSelect("light")}
        >
          <span
            className="theme-swatch"
            style={{ background: "#f8f7f4", borderColor: "#e4e5eb" }}
          >
            <i style={{ background: "#ffffff" }} />
            <i style={{ background: "#6962d7" }} />
          </span>
          <span>Light</span>
        </button>
        {DARK_THEME_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={
              theme === "dark" && darkPalette(darkTheme).id === preset.id
                ? "active"
                : ""
            }
            aria-pressed={
              theme === "dark" && darkPalette(darkTheme).id === preset.id
            }
            onClick={() => onSelect(preset.id)}
          >
            <span
              className="theme-swatch"
              style={{ background: preset.bg, borderColor: preset.line }}
            >
              <i style={{ background: preset.panel }} />
              <i style={{ background: preset.accent }} />
            </span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  change,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  change: (v: number) => void;
}) {
  return (
    <div className="field">
      <label>
        {label} · {value}
      </label>
      <div className="number-slider">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => change(Number(e.target.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
}
function PatternColorPicker({
  value,
  change,
}: {
  value: string;
  change: (value: string) => void;
}) {
  const current = /^#[0-9a-f]{6}$/i.test(value) ? value : "#a47b4c";
  return (
    <label className="pattern-color-picker" title="Pattern color">
      <span style={{ backgroundColor: current }} />
      <input
        type="color"
        value={current}
        onChange={(event) => change(event.target.value)}
        aria-label="Pattern color"
      />
      <span>Color</span>
    </label>
  );
}

function ColorField({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const pickerRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(value), [value]);
  const current = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)
    ? value.slice(0, 7)
    : "#000000";
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  };
  return (
    <div className="field color-control">
      <label>{label}</label>
      <div className="color-palette" role="group" aria-label={label}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={
              color.toLowerCase() === current.toLowerCase() ? "active" : ""
            }
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`${label}: ${color}`}
            aria-pressed={color.toLowerCase() === current.toLowerCase()}
            onClick={() => change(color)}
            onDoubleClick={openPicker}
          />
        ))}
        <label className="custom-color" title={`Custom color: ${label}`}>
          <Palette size={15} />
          <input
            ref={pickerRef}
            type="color"
            value={current}
            onChange={(e) => change(e.target.value)}
            aria-label={`Custom color: ${label}`}
          />
        </label>
      </div>
      <div className="color-field">
        <span
          className="color-current"
          style={{ backgroundColor: current }}
          onDoubleClick={openPicker}
          title="Double-click to choose a color"
        />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) change(e.target.value);
          }}
          onBlur={() => setDraft(value)}
          aria-label={`${label} (hex code)`}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
