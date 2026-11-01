import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
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
} from "@xyflow/react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { MapDocument, MapStroke } from "../types";
import { FreehandLayer } from "./FreehandLayer";
import { childrenOf, descendants, visibleIds } from "../lib/tree";
import { lineStrokeStyle, strokeDasharray } from "../lib/stroke";
import { darkPalette } from "../themePresets";
import { lineAnimationStyle, resolveLineAnimation } from "../lib/lineAnimation";
import { StudioNode, type StudioFlowNode } from "./StudioNode";
const nodeTypes = { studio: StudioNode };
interface Props {
  doc: MapDocument;
  openingEdges: string[];
  selectedIds: string[];
  selectedEdge: string | null;
  selectedEdgeIds: string[];
  selectedStroke: string | null;
  searchId: string | null;
  mode: "select" | "connect" | "pan" | "draw";
  locked: boolean;
  drawColor: string;
  drawWidth: number;
  onStroke: (stroke: MapStroke) => void;
  onMoveStroke: (id: string, dx: number, dy: number) => void;
  onResizeStroke: (id: string, points: MapStroke["points"]) => void;
  onSelectStroke: (id: string) => void;
  onToggleLock: () => void;
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
  onContext: (
    x: number,
    y: number,
    nodeId: string | null,
    flowPosition: { x: number; y: number },
  ) => void;
  onDeleteSelection: () => void;
  fitToken: number;
}
function CanvasInner(p: Props) {
  const { screenToFlowPosition, fitView, setCenter } = useReactFlow();
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
            readOnly: p.locked,
          },
          draggable: !p.locked && p.mode !== "pan" && p.mode !== "draw",
        })),
    [
      p.doc.nodes,
      p.selectedIds,
      p.searchId,
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
        const active =
          p.openingEdges.includes(n.id) && animation.mode !== "none";
        return {
          id: `tree-${n.id}`,
          className: active
            ? `line-animation line-animation-${animation.mode} line-animation-once`
            : "",
          source: n.parentId!,
          target: n.id,
          type: n.parentLineType ?? "default",
          selected: p.selectedEdgeIds.includes(`tree-${n.id}`),
          interactionWidth: 24,
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
          type: e.type,
          label: e.label,
          labelStyle: {
            fontSize: e.labelFontSize ?? 12,
            fill: e.labelColor ?? e.color,
          },
          selected: p.selectedEdgeIds.includes(e.id),
          interactionWidth: 24,
          style: {
            stroke: e.color,
            strokeWidth: e.width,
            strokeDasharray: strokeDasharray(
              lineStrokeStyle(e.strokeStyle, e.dashed),
            ),
            strokeLinecap: "round",
            ...lineAnimationStyle(animation),
          },
          markerEnd: e.arrow
            ? { type: MarkerType.ArrowClosed, color: e.arrowColor ?? e.color }
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
  const onSelectionChange = useCallback(
    (selection: { nodes: { id: string }[]; edges: { id: string }[] }) => {
      p.onSelect(
        selection.nodes.map((node) => node.id),
        selection.nodes.length ? null : selection.edges.map((edge) => edge.id),
      );
    },
    [p.onSelect],
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodesConnectable={!p.locked && p.mode !== "pan" && p.mode !== "draw"}
      nodesDraggable={!p.locked && p.mode !== "pan" && p.mode !== "draw"}
      connectionMode={ConnectionMode.Loose}
      selectionOnDrag={p.mode === "select"}
      panOnDrag={
        p.mode === "draw" ? false : p.mode === "select" ? [1, 2] : [0, 1, 2]
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
      onPaneContextMenu={(e) => {
        e.preventDefault();
        if (!p.locked)
          p.onContext(
            e.clientX,
            e.clientY,
            null,
            screenToFlowPosition({ x: e.clientX, y: e.clientY }),
          );
      }}
      onNodeContextMenu={(e, n) => {
        e.preventDefault();
        if (!p.locked)
          p.onContext(
            e.clientX,
            e.clientY,
            n.id,
            screenToFlowPosition({ x: e.clientX, y: e.clientY }),
          );
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
        locked={p.locked}
        selectedId={p.selectedStroke}
        color={p.drawColor}
        width={p.drawWidth}
        onAdd={p.onStroke}
        onSelect={p.onSelectStroke}
        onMoveStroke={p.onMoveStroke}
        onResizeStroke={p.onResizeStroke}
      />
      <Controls showInteractive={false}>
        <ControlButton
          title={p.locked ? "Sblocca mappa" : "Blocca modifiche"}
          aria-label={p.locked ? "Sblocca mappa" : "Blocca modifiche"}
          onClick={p.onToggleLock}
        >
          {p.locked ? <LockKeyhole size={16} /> : <LockKeyholeOpen size={16} />}
        </ControlButton>
      </Controls>
      {p.doc.settings.minimap && (
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
