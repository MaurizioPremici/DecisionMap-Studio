import { useRef, useState, type PointerEvent } from "react";
import { useReactFlow, useViewport, ViewportPortal } from "@xyflow/react";
import type { MapStroke } from "../types";
import { eraseFreehandStrokes, freehandPath } from "../lib/freehand";

interface Props {
  strokes: MapStroke[];
  active: boolean;
  erasing: boolean;
  eraserSize: number;
  locked: boolean;
  selectedId: string | null;
  color: string;
  width: number;
  onAdd: (stroke: MapStroke) => void;
  onErase: (strokes: MapStroke[]) => void;
  onSelect: (id: string) => void;
  onMoveStroke: (id: string, dx: number, dy: number) => void;
  onResizeStroke: (id: string, points: MapStroke["points"]) => void;
}
interface DragState {
  id: string;
  pointerId: number;
  start: { x: number; y: number };
  clientX: number;
  clientY: number;
  dx: number;
  dy: number;
  distance: number;
}
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
interface ResizeState {
  id: string;
  pointerId: number;
  corner: Corner;
  start: { x: number; y: number };
  frame: ReturnType<typeof bounds>;
  points: MapStroke["points"];
  currentPoints: MapStroke["points"];
  changed: boolean;
}

function bounds(points: MapStroke["points"], padding: number) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX) + 2 * padding,
    height: Math.max(1, maxY - minY) + 2 * padding,
  };
}

export function FreehandLayer({
  strokes,
  active,
  erasing,
  eraserSize,
  locked,
  selectedId,
  color,
  width,
  onAdd,
  onErase,
  onSelect,
  onMoveStroke,
  onResizeStroke,
}: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();
  const [draft, setDraft] = useState<MapStroke | null>(null);
  const draftRef = useRef<MapStroke | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    dx: number;
    dy: number;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    points: MapStroke["points"];
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const eraseRef = useRef<{
    pointerId: number;
    path: MapStroke["points"];
    id: string;
  } | null>(null);
  const [erasePreview, setErasePreview] = useState<MapStroke[] | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const setCurrent = (stroke: MapStroke | null) => {
    draftRef.current = stroke;
    setDraft(stroke);
  };
  const point = (e: PointerEvent<Element>) =>
    screenToFlowPosition({ x: e.clientX, y: e.clientY });
  const updateCursor = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const startErase = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    eraseRef.current = {
      pointerId: e.pointerId,
      path: [point(e)],
      id: crypto.randomUUID(),
    };
    updateCursor(e);
    setErasePreview(
      eraseFreehandStrokes(
        strokes,
        eraseRef.current.path,
        eraserSize / (2 * zoom),
        eraseRef.current.id,
      ),
    );
  };
  const moveErase = (e: PointerEvent<HTMLDivElement>) => {
    updateCursor(e);
    const gesture = eraseRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const next = point(e);
    const last = gesture.path.at(-1)!;
    if (Math.hypot(next.x - last.x, next.y - last.y) < 2 / zoom) return;
    gesture.path.push(next);
    setErasePreview(
      eraseFreehandStrokes(
        strokes,
        gesture.path,
        eraserSize / (2 * zoom),
        gesture.id,
      ),
    );
  };
  const finishErase = (e: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = eraseRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    eraseRef.current = null;
    setErasePreview(null);
    if (!cancelled) {
      const result = eraseFreehandStrokes(
        strokes,
        gesture.path,
        eraserSize / (2 * zoom),
        gesture.id,
      );
      if (result !== strokes) onErase(result);
    }
  };

  const startDraw = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setCurrent({ id: crypto.randomUUID(), points: [point(e)], color, width });
  };
  const moveDraw = (e: PointerEvent<HTMLDivElement>) => {
    const current = draftRef.current;
    if (!current) return;
    const next = point(e),
      last = current.points.at(-1)!;
    if (Math.hypot(next.x - last.x, next.y - last.y) > 1.2)
      setCurrent({ ...current, points: [...current.points, next] });
  };
  const finishDraw = (e: PointerEvent<HTMLDivElement>) => {
    const current = draftRef.current;
    if (!current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    setCurrent(null);
    onAdd(current);
  };

  const startMove = (e: PointerEvent<SVGElement>, id: string) => {
    if (e.button !== 0 || active || erasing || locked) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      start: point(e),
      clientX: e.clientX,
      clientY: e.clientY,
      dx: 0,
      dy: 0,
      distance: 0,
    };
    onSelect(id);
  };
  const moveStroke = (e: PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const distance = Math.hypot(
      e.clientX - drag.clientX,
      e.clientY - drag.clientY,
    );
    const current = point(e);
    drag.dx = distance >= 3 ? current.x - drag.start.x : 0;
    drag.dy = distance >= 3 ? current.y - drag.start.y : 0;
    drag.distance = distance;
    setPreview({ id: drag.id, dx: drag.dx, dy: drag.dy });
  };
  const finishMove = (e: PointerEvent<SVGElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    if (!cancelled && drag.distance >= 3)
      onMoveStroke(drag.id, drag.dx, drag.dy);
    setPreview(null);
  };
  const moveHandlers = (id: string) => ({
    onPointerDown: (e: PointerEvent<SVGElement>) => startMove(e, id),
    onPointerMove: moveStroke,
    onPointerUp: (e: PointerEvent<SVGElement>) => finishMove(e),
    onPointerCancel: (e: PointerEvent<SVGElement>) => finishMove(e, true),
  });
  const startResize = (
    e: PointerEvent<SVGRectElement>,
    stroke: MapStroke,
    corner: Corner,
  ) => {
    if (e.button !== 0 || active || erasing || locked) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      id: stroke.id,
      pointerId: e.pointerId,
      corner,
      start: point(e),
      frame: bounds(stroke.points, 0),
      points: stroke.points,
      currentPoints: stroke.points,
      changed: false,
    };
  };
  const resizeStroke = (e: PointerEvent<SVGRectElement>) => {
    const drag = resizeRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const current = point(e),
      dx = current.x - drag.start.x,
      dy = current.y - drag.start.y;
    const left = drag.corner.endsWith("left"),
      top = drag.corner.startsWith("top");
    const minSize = 12 / zoom;
    const x1 = left
      ? Math.min(drag.frame.x + dx, drag.frame.x + drag.frame.width - minSize)
      : drag.frame.x;
    const x2 = left
      ? drag.frame.x + drag.frame.width
      : Math.max(drag.frame.x + drag.frame.width + dx, drag.frame.x + minSize);
    const y1 = top
      ? Math.min(drag.frame.y + dy, drag.frame.y + drag.frame.height - minSize)
      : drag.frame.y;
    const y2 = top
      ? drag.frame.y + drag.frame.height
      : Math.max(drag.frame.y + drag.frame.height + dy, drag.frame.y + minSize);
    const points = drag.points.map((p) => ({
      x: x1 + ((p.x - drag.frame.x) * (x2 - x1)) / drag.frame.width,
      y: y1 + ((p.y - drag.frame.y) * (y2 - y1)) / drag.frame.height,
    }));
    drag.currentPoints = points;
    drag.changed =
      Math.abs(x2 - x1 - drag.frame.width) > 0.01 ||
      Math.abs(y2 - y1 - drag.frame.height) > 0.01;
    setResizePreview({ id: drag.id, points });
  };
  const finishResize = (e: PointerEvent<SVGRectElement>, cancelled = false) => {
    const drag = resizeRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    resizeRef.current = null;
    if (!cancelled && drag.changed) onResizeStroke(drag.id, drag.currentPoints);
    setResizePreview(null);
  };

  return (
    <>
      <ViewportPortal>
        <svg className="freehand-strokes">
          {[...(erasePreview ?? strokes), ...(draft ? [draft] : [])].map(
            (stroke) => {
              const selected = selectedId === stroke.id;
              const offset = preview?.id === stroke.id ? preview : null;
              const points =
                resizePreview?.id === stroke.id
                  ? resizePreview.points
                  : stroke.points;
              const d = freehandPath(points);
              const frame = bounds(points, Math.max(10, 12 / zoom));
              return (
                <g
                  key={stroke.id}
                  transform={
                    offset
                      ? "translate(" + offset.dx + " " + offset.dy + ")"
                      : undefined
                  }
                >
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                    style={
                      selected
                        ? { filter: "drop-shadow(0 0 5px var(--accent))" }
                        : undefined
                    }
                  />
                  {!active && !erasing && !locked && stroke !== draft && (
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(stroke.width + 12, 26 / zoom)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        pointerEvents: "stroke",
                        cursor: offset ? "grabbing" : "grab",
                      }}
                      {...moveHandlers(stroke.id)}
                    />
                  )}
                  {selected && !active && !erasing && !locked && (
                    <rect
                      x={frame.x}
                      y={frame.y}
                      width={frame.width}
                      height={frame.height}
                      rx={7 / zoom}
                      fill="transparent"
                      stroke="var(--accent)"
                      strokeWidth={1.2 / zoom}
                      strokeDasharray={6 / zoom + " " + 4 / zoom}
                      opacity=".5"
                      style={{
                        pointerEvents: "all",
                        cursor: offset ? "grabbing" : "grab",
                      }}
                      {...moveHandlers(stroke.id)}
                    />
                  )}
                  {selected &&
                    !active &&
                    !erasing &&
                    !locked &&
                    (
                      [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ] as const
                    ).map((corner) => {
                      const size = 16 / zoom,
                        cx =
                          frame.x +
                          (corner.endsWith("right") ? frame.width : 0),
                        cy =
                          frame.y +
                          (corner.startsWith("bottom") ? frame.height : 0);
                      return (
                        <rect
                          key={corner}
                          x={cx - size / 2}
                          y={cy - size / 2}
                          width={size}
                          height={size}
                          rx={2 / zoom}
                          fill="var(--panel)"
                          stroke="var(--accent)"
                          strokeWidth={2 / zoom}
                          style={{
                            pointerEvents: "all",
                            cursor:
                              corner === "top-left" || corner === "bottom-right"
                                ? "nwse-resize"
                                : "nesw-resize",
                          }}
                          onPointerDown={(e) => startResize(e, stroke, corner)}
                          onPointerMove={resizeStroke}
                          onPointerUp={(e) => finishResize(e)}
                          onPointerCancel={(e) => finishResize(e, true)}
                        />
                      );
                    })}
                </g>
              );
            },
          )}
        </svg>
      </ViewportPortal>
      {active && (
        <div
          className="freehand-input"
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={finishDraw}
          onPointerCancel={finishDraw}
        />
      )}
      {erasing && (
        <div
          className="freehand-input eraser-input"
          onPointerEnter={updateCursor}
          onPointerLeave={() => {
            if (!eraseRef.current) setCursor(null);
          }}
          onPointerDown={startErase}
          onPointerMove={moveErase}
          onPointerUp={(e) => finishErase(e)}
          onPointerCancel={(e) => finishErase(e, true)}
        >
          {cursor && (
            <span
              className="eraser-cursor"
              style={{
                left: cursor.x,
                top: cursor.y,
                width: eraserSize,
                height: eraserSize,
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
