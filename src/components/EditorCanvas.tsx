import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnReconnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MapDocument, MapStroke } from "../types";
import { FreehandLayer } from "./FreehandLayer";
import { childrenOf, descendants, visibleIds } from "../lib/tree";
import { lineStrokeStyle, strokeDasharray } from "../lib/stroke";
import { darkPalette } from "../themePresets";
import { lineAnimationStyle, resolveLineAnimation } from "../lib/lineAnimation";
import { StudioNode, type StudioFlowNode } from "./StudioNode";
import { EditableEdge } from "./EditableEdge";
const nodeTypes = { studio: StudioNode };
const edgeTypes = { editable: EditableEdge };
interface Props {
  doc: MapDocument;
  openingEdges: string[];
  selectedIds: string[];
  selectedEdge: string | null;
  selectedEdgeIds: string[];
  selectedStroke: string | null;
  searchId: string | null;
  newNodeId: string | null;
  mode: "select" | "connect" | "pan" | "draw" | "erase" | "rectangle";
  locked: boolean;
  embedded?: boolean;
  drawColor: string;
  drawWidth: number;
  eraserSize: number;
  onStroke: (stroke: MapStroke) => void;
  onEraseStrokes: (strokes: MapStroke[]) => void;
  onEraseElements: (nodeIds: string[], edgeIds: string[]) => void;
  onCreateRectangle: (rect: {x:number;y:number;width:number;height:number}) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMoveStroke: (id: string, dx: number, dy: number) => void;
  onResizeStroke: (id: string, points: MapStroke["points"]) => void;
  onSelectStroke: (id: string) => void;
  onSelect: (ids: string[], edge: string | null | string[]) => void;
  onMove: (moves: { id: string; x: number; y: number }[]) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  editingId: string | null;
  onInlineSave: (id: string, title: string) => void;
  onRotate: (id: string, rotation: number) => void;
  onCurve: (id: string, curveX: number, curveY: number) => void;
  onConnect: (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => void;
  onReconnect: (
    edgeId: string,
    connection: {
      source: string;
      target: string;
      sourceHandle: string | null;
      targetHandle: string | null;
    },
  ) => void;
  onEdgeControl: (id: string, point: { x: number; y: number }) => void;
  exportSelecting: boolean;
  onExportRect: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onContext: (
    x: number,
    y: number,
    nodeId: string | null,
    flowPosition: { x: number; y: number },
    bounds: { left: number; top: number; right: number; bottom: number },
  ) => void;
  onDeleteSelection: () => void;
  fitToken: number;
  zoomInToken: number;
  zoomOutToken: number;
}
function CanvasInner(p: Props) {
  const { screenToFlowPosition, fitView, setCenter, zoomIn, zoomOut } = useReactFlow();
  const hostRef = useRef<HTMLDivElement>(null);
  const contextStateRef = useRef({
    locked: p.locked,
    onContext: p.onContext,
    screenToFlowPosition,
  });
  contextStateRef.current = {
    locked: p.locked,
    onContext: p.onContext,
    screenToFlowPosition,
  };
  const [exportDrag, setExportDrag] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    screenStart: { x: number; y: number };
    screenEnd: { x: number; y: number };
  } | null>(null);
  const [rectangleDrag, setRectangleDrag] = useState<{
    start: {x:number;y:number}; screenStart:{x:number;y:number}; screenEnd:{x:number;y:number};
  } | null>(null);
  const visible = useMemo(() => visibleIds(p.doc.nodes), [p.doc.nodes]);
  const sourceNodes = useMemo<StudioFlowNode[]>(
    () =>
      p.doc.nodes
        .filter((n) => visible.has(n.id))
        .map((n) => ({
          id: n.id,
          type: "studio",
          zIndex: 100 + p.doc.nodes.indexOf(n),
          position: n.position,
          style: { width: n.style.width, height: n.style.height },
          selected: p.selectedIds.includes(n.id),
          data: {
            item: n,
            children: childrenOf(p.doc.nodes, n.id).length,
            hidden: descendants(p.doc.nodes, n.id).length,
            onToggle: p.onToggle,
            onEdit: p.onEdit,
            editing: p.editingId === n.id,
            onInlineSave: p.onInlineSave,
            onRotate: p.onRotate,
            onCurve: p.onCurve,
            onResize: p.onResize,
            highlight: p.searchId === n.id,
            isNew: p.newNodeId === n.id,
            readOnly: p.locked || Boolean(n.locked),
          },
          draggable:
            !p.locked &&
            !n.locked &&
            p.mode !== "pan" &&
            p.mode !== "draw" &&
            p.mode !== "erase" && p.mode !== "rectangle",
        })),
    [
      p.doc.nodes,
      p.selectedIds,
      p.searchId,
      p.newNodeId,
      p.locked,
      p.mode,
      visible,
      p.onToggle,
      p.onEdit,
      p.editingId,
      p.onInlineSave,
      p.onRotate,
      p.onCurve,
      p.onResize,
    ],
  );
  const sourceEdges = useMemo<Edge[]>(() => {
    const hierarchical: Edge[] = p.doc.nodes
      .filter((n) => n.parentId && visible.has(n.id) && visible.has(n.parentId))
      .map((n) => {
        const animation = resolveLineAnimation(n.parentAnimation, true);
        return {
          id: `tree-${n.id}`,
          className: animation.mode === "none"
            ? ""
            : `line-animation line-animation-${animation.mode} line-animation-loop`,
          source: n.parentId!,
          target: n.id,
          sourceHandle: n.parentSourceHandle,
          targetHandle: n.parentTargetHandle,
          type: "editable",
          reconnectable: !n.parentLineLocked,
          data: {
            pathType: n.parentLineType ?? "default",
            controlPoint: n.parentControlPoint,
            onControlPoint: p.onEdgeControl,
            locked: n.parentLineLocked,
          },
          selected: p.selectedEdgeIds.includes(`tree-${n.id}`),
          interactionWidth: 36,
          style: {
            stroke:
              n.parentLineColor ??
              (p.doc.settings.theme === "dark"
                ? darkPalette(p.doc.settings.darkTheme).edge
                : "#8796bb"),
            strokeWidth: n.parentLineWidth ?? 4,
            strokeDasharray: strokeDasharray(n.parentLineStyle ?? "solid"),
            strokeLinecap: "round",
            ...lineAnimationStyle(animation),
          },
        };
      });
    const references: Edge[] = p.doc.links
      .filter((e) => visible.has(e.source) && visible.has(e.target))
      .map((e) => {
        const animation = resolveLineAnimation(e.animation, false);
        return {
          id: e.id,
          className:
            animation.mode === "none"
              ? ""
              : `line-animation line-animation-${animation.mode} line-animation-loop`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: "editable",
          reconnectable: !e.locked,
          data: {
            pathType: e.type,
            controlPoint: e.controlPoint,
            onControlPoint: p.onEdgeControl,
            locked: e.locked,
          },
          label: e.label,
          labelStyle: {
            fontSize: e.labelFontSize ?? 12,
            fill: e.labelColor ?? e.color,
          },
          selected: p.selectedEdgeIds.includes(e.id),
          interactionWidth: 36,
          style: {
            stroke: e.color,
            strokeWidth: e.width,
            strokeDasharray: strokeDasharray(
              lineStrokeStyle(e.strokeStyle, e.dashed),
            ),
            strokeLinecap: "round",
            ...lineAnimationStyle(animation),
          },
          markerStart: e.markerStart && e.markerStart !== "none"
            ? { type: e.markerStart === "arrow" ? MarkerType.Arrow : MarkerType.ArrowClosed, color: e.arrowColor ?? e.color }
            : undefined,
          markerEnd: (e.markerEnd ?? (e.arrow ? "arrowclosed" : "none")) !== "none"
            ? { type: e.markerEnd === "arrow" ? MarkerType.Arrow : MarkerType.ArrowClosed, color: e.arrowColor ?? e.color }
            : undefined,
        };
      });
    return [...hierarchical, ...references];
  }, [
    p.doc.links,
    p.doc.nodes,
    p.doc.settings.theme,
    p.doc.settings.darkTheme,
    p.selectedEdge,
    p.selectedEdgeIds,
    p.openingEdges,
    p.onEdgeControl,
    visible,
  ]);
  const [nodes, setNodes] = useState(sourceNodes);
  const [edges, setEdges] = useState(sourceEdges);
  useEffect(
    () =>
      setNodes((previous) =>
        sourceNodes.map((next) => {
          const prior = previous.find((item) => item.id === next.id);
          return {
            ...next,
            position: prior?.dragging ? prior.position : next.position,
            dragging: prior?.dragging,
          };
        }),
      ),
    [sourceNodes],
  );
  useEffect(() => setEdges(sourceEdges), [sourceEdges]);
  useEffect(() => {
    window.setTimeout(
      () => fitView({ padding: 0.25, duration: 350, maxZoom: 1.2 }),
      50,
    );
  }, [p.fitToken, fitView]);
  useEffect(() => {
    if (p.zoomInToken) void zoomIn({ duration: 160 });
  }, [p.zoomInToken, zoomIn]);
  useEffect(() => {
    if (p.zoomOutToken) void zoomOut({ duration: 160 });
  }, [p.zoomOutToken, zoomOut]);
  useEffect(() => {
    if (!p.searchId) return;
    const n = p.doc.nodes.find((x) => x.id === p.searchId);
    if (n)
      setCenter(
        n.position.x + n.style.width / 2,
        n.position.y + n.style.height / 2,
        { zoom: 1.15, duration: 400 },
      );
  }, [p.searchId, setCenter, p.doc.nodes]);
  const onNodesChange = (changes: NodeChange<StudioFlowNode>[]) =>
    setNodes((ns) => applyNodeChanges(changes, ns));
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges((es) => applyEdgeChanges(changes, es));
  const onConnect: OnConnect = (c: Connection) => {
    if (!p.locked && c.source && c.target)
      p.onConnect(
        c.source,
        c.target,
        c.sourceHandle ?? undefined,
        c.targetHandle ?? undefined,
      );
  };
  const onReconnect: OnReconnect = (edge, connection) => {
    if (p.locked) return;
    p.onReconnect(edge.id, connection);
  };
  const onSelectionChange = useCallback(
    (selection: { nodes: { id: string }[]; edges: { id: string }[] }) => {
      p.onSelect(
        selection.nodes.map((node) => node.id),
        selection.nodes.length ? null : selection.edges.map((edge) => edge.id),
      );
    },
    [p.onSelect],
  );
  const eraseElements = useCallback((points: MapStroke["points"], radius: number) => {
    if (!points.length) return;
    const nodeIds = p.doc.nodes.filter(n => !n.locked && points.some(point =>
      point.x >= n.position.x - radius && point.x <= n.position.x + n.style.width + radius &&
      point.y >= n.position.y - radius && point.y <= n.position.y + n.style.height + radius
    )).map(n => n.id);
    const edgeIds: string[] = [];
    document.querySelectorAll<SVGGElement>(".canvas-wrap .react-flow__edge[data-id]").forEach(edge => {
      const id = edge.getAttribute("data-id");
      const path = edge.querySelector<SVGPathElement>(".react-flow__edge-path");
      if (!id || !path) return;
      const locked = id.startsWith("tree-")
        ? p.doc.nodes.find(n => n.id === id.slice(5))?.parentLineLocked
        : p.doc.links.find(link => link.id === id)?.locked;
      if (locked) return;
      const length = path.getTotalLength();
      for (let distance = 0; distance <= length + 8; distance += 8) {
        const sample = path.getPointAtLength(Math.min(distance, length));
        if (points.some(point => Math.hypot(point.x - sample.x, point.y - sample.y) <= radius + 5)) {
          edgeIds.push(id); break;
        }
      }
    });
    p.onEraseElements(nodeIds, edgeIds);
  }, [p.doc.nodes, p.doc.links, p.onEraseElements]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const openContextMenu = (event: MouseEvent) => {
      const contextState = contextStateRef.current;
      if (contextState.locked) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !host.contains(target)) return;
      if (
        target.closest(
          "input, textarea, select, [contenteditable='true'], .canvas-group-actions",
        )
      )
        return;

      // React Flow and Obsidian both install context-menu handlers. Capture the
      // native event first so a right click works reliably regardless of which
      // SVG/HTML child is under the pointer.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Electron can report an SVG, geometric mask or resize overlay as the
      // context-menu target. Resolve the node from the complete hit stack so
      // the whole visible figure works, not only its border and handles.
      const hitElements = [
        target,
        ...document.elementsFromPoint(event.clientX, event.clientY),
      ];
      let nodeId: string | null = null;
      for (const hit of hitElements) {
        const studioNode = hit.closest<HTMLElement>(
          "[data-decision-map-node-id]",
        );
        const flowNode = hit.closest<HTMLElement>(
          ".react-flow__node[data-id]",
        );
        nodeId =
          studioNode?.dataset.decisionMapNodeId ?? flowNode?.dataset.id ?? null;
        if (nodeId) break;
      }
      if (!nodeId) {
        const containingNodes = Array.from(
          host.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
        )
          .filter((node) => {
            const bounds = node.getBoundingClientRect();
            return (
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom
            );
          })
          .sort((a, b) => {
            const aBounds = a.getBoundingClientRect();
            const bBounds = b.getBoundingClientRect();
            return aBounds.width * aBounds.height - bBounds.width * bBounds.height;
          });
        nodeId = containingNodes[0]?.dataset.id ?? null;
      }
      const rect = host.getBoundingClientRect();
      contextState.onContext(
        event.clientX,
        event.clientY,
        nodeId,
        contextState.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
        {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        },
      );
    };
    // Listen at document capture level: Obsidian and Electron can intercept the
    // event before it reaches the embedded React root. The host containment
    // guard above keeps this listener strictly scoped to this map canvas.
    document.addEventListener("contextmenu", openContextMenu, true);
    return () =>
      document.removeEventListener("contextmenu", openContextMenu, true);
  }, []);
  return (
    <div ref={hostRef} className="editor-canvas-host">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable={!p.locked}
        reconnectRadius={22}
        nodesConnectable={
          !p.locked &&
          p.mode !== "pan" &&
          p.mode !== "draw" &&
          p.mode !== "erase" && p.mode !== "rectangle"
        }
        nodesDraggable={
          !p.locked &&
          p.mode !== "pan" &&
          p.mode !== "draw" &&
          p.mode !== "erase" && p.mode !== "rectangle"
        }
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag={!p.embedded && p.mode === "select"}
        panOnDrag={
          p.embedded
            ? [0, 1, 2]
            : p.mode === "draw" || p.mode === "erase" || p.mode === "rectangle"
            ? false
            : p.mode === "select"
              ? [1, 2]
              : [0, 1, 2]
        }
        multiSelectionKeyCode="Shift"
        onNodeDragStop={(_, node) => {
          if (p.locked) return;
          const selected = nodes.filter((n) => n.selected);
          const moves = (selected.length ? selected : [node]).map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
          }));
          p.onMove(moves);
        }}
        onSelectionChange={onSelectionChange}
        snapToGrid={p.doc.settings.snap}
        snapGrid={[20, 20]}
        minZoom={0.08}
        maxZoom={3}
        fitView
        elevateNodesOnSelect={false}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
      >
        {p.doc.settings.grid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={
              p.doc.settings.theme === "dark"
                ? darkPalette(p.doc.settings.darkTheme).grid
                : "#d8deeb"
            }
          />
        )}
        <FreehandLayer
          strokes={p.doc.strokes ?? []}
          active={p.mode === "draw" && !p.locked}
          erasing={p.mode === "erase" && !p.locked}
          eraserSize={p.eraserSize}
          locked={p.locked}
          selectedId={p.selectedStroke}
          color={p.drawColor}
          width={p.drawWidth}
          onAdd={p.onStroke}
          onErase={p.onEraseStrokes}
          onEraseGesture={eraseElements}
          onSelect={p.onSelectStroke}
          onMoveStroke={p.onMoveStroke}
          onResizeStroke={p.onResizeStroke}
        />
        {p.doc.settings.minimap && !p.embedded && (
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              (n.data as StudioDataLike).item?.style.background ?? "#fff"
            }
          />
        )}
        <KeyboardDelete onDelete={p.onDeleteSelection} locked={p.locked} />
      </ReactFlow>
      {!p.locked && p.mode === "select" && p.selectedIds.length >= 2 && (
        <div className="canvas-group-actions">
          <button type="button" onClick={p.onGroup}>Group selection</button>
          {p.doc.nodes.some(n => p.selectedIds.includes(n.id) && n.groupId) &&
            <button type="button" onClick={p.onUngroup}>Ungroup</button>}
        </div>
      )}
      {!p.locked && p.mode === "rectangle" && (
        <div className="export-area-overlay rectangle-draw-overlay"
          onPointerDown={event => {
            if (event.button !== 0) return;
            const box = event.currentTarget.getBoundingClientRect();
            setRectangleDrag({start:screenToFlowPosition({x:event.clientX,y:event.clientY}),
              screenStart:{x:event.clientX-box.left,y:event.clientY-box.top},
              screenEnd:{x:event.clientX-box.left,y:event.clientY-box.top}});
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (!rectangleDrag) return;
            const box = event.currentTarget.getBoundingClientRect();
            setRectangleDrag({...rectangleDrag,screenEnd:{x:event.clientX-box.left,y:event.clientY-box.top}});
          }}
          onPointerUp={event => {
            if (!rectangleDrag) return;
            const end=screenToFlowPosition({x:event.clientX,y:event.clientY});
            const rect={x:Math.min(rectangleDrag.start.x,end.x),y:Math.min(rectangleDrag.start.y,end.y),
              width:Math.abs(end.x-rectangleDrag.start.x),height:Math.abs(end.y-rectangleDrag.start.y)};
            setRectangleDrag(null);
            if (rect.width>=20 && rect.height>=20) p.onCreateRectangle(rect);
          }}>
          {rectangleDrag && <div className="export-area-preview" style={{
            left:Math.min(rectangleDrag.screenStart.x,rectangleDrag.screenEnd.x),
            top:Math.min(rectangleDrag.screenStart.y,rectangleDrag.screenEnd.y),
            width:Math.abs(rectangleDrag.screenEnd.x-rectangleDrag.screenStart.x),
            height:Math.abs(rectangleDrag.screenEnd.y-rectangleDrag.screenStart.y)
          }}/>}
        </div>
      )}
      {p.exportSelecting && (
        <div
          className="export-area-overlay"
          onPointerDown={(event) => {
            const start = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            const box = event.currentTarget.getBoundingClientRect();
            const screenStart = {
              x: event.clientX - box.left,
              y: event.clientY - box.top,
            };
            setExportDrag({
              start,
              end: start,
              screenStart,
              screenEnd: screenStart,
            });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!exportDrag) return;
            const box = event.currentTarget.getBoundingClientRect();
            setExportDrag({
              ...exportDrag,
              end: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
              screenEnd: {
                x: event.clientX - box.left,
                y: event.clientY - box.top,
              },
            });
          }}
          onPointerUp={(event) => {
            if (!exportDrag) return;
            const end = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            const x = Math.min(exportDrag.start.x, end.x),
              y = Math.min(exportDrag.start.y, end.y);
            const width = Math.abs(end.x - exportDrag.start.x),
              height = Math.abs(end.y - exportDrag.start.y);
            setExportDrag(null);
            if (width > 5 && height > 5)
              p.onExportRect({ x, y, width, height });
          }}
        >
          {exportDrag && (
            <div
              className="export-area-preview"
              style={{
                left: Math.min(
                  exportDrag.screenStart.x,
                  exportDrag.screenEnd.x,
                ),
                top: Math.min(exportDrag.screenStart.y, exportDrag.screenEnd.y),
                width: Math.abs(
                  exportDrag.screenEnd.x - exportDrag.screenStart.x,
                ),
                height: Math.abs(
                  exportDrag.screenEnd.y - exportDrag.screenStart.y,
                ),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
interface StudioDataLike {
  item?: { style: { background: string } };
}
function KeyboardDelete({
  onDelete,
  locked,
}: {
  onDelete: () => void;
  locked: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        !locked &&
        (e.key === "Delete" || e.key === "Backspace") &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        onDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDelete, locked]);
  return null;
}
export function EditorCanvas(p: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...p} />
    </ReactFlowProvider>
  );
}
