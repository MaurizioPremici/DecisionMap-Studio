import { useEffect, useRef, useState } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { artBackgroundImage } from "../artStyles";
import { roughBorderPaths } from "../lib/roughBorder";
import { strokeDasharray } from "../lib/stroke";
import type { MapNode } from "../types";
export interface StudioData extends Record<string, unknown> {
  item: MapNode;
  children: number;
  hidden: number;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onInlineSave: (id: string, title: string) => void;
  onRotate: (id: string, rotation: number) => void;
  onCurve: (id: string, curveX: number, curveY: number) => void;
  onResize: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  highlight: boolean;
  readOnly: boolean;
  editing: boolean;
  isNew: boolean;
}
export type StudioFlowNode = Node<StudioData, "studio">;
export function StudioNode({ id, data, selected }: NodeProps<StudioFlowNode>) {
  const n = data.item;
  const s = n.style;
  const geometric = s.shape === "diamond" || s.shape === "triangle";
  const arrow = s.shape === "arrow";
  const linear = arrow || s.shape === "line";
  const textOnly = Boolean(
    n.textOnly ||
    (s.background === "#ffffff00" && s.borderWidth === 0 && !n.imageSrc),
  );
  const [preview, setPreview] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const [curvePreview, setCurvePreview] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rotateGesture = useRef<{
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
    currentRotation: number;
  } | null>(null);
  const titleRef = useRef<HTMLElement>(null);
  useEffect(() => setPreview(null), [s.width, s.height]);
  useEffect(() => {
    if (!data.editing || !titleRef.current) return;
    const timer = window.setTimeout(() => {
      if (!titleRef.current) return;
      titleRef.current.focus({ preventScroll: true });
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [data.editing]);
  const w = preview?.width ?? s.width,
    h = preview?.height ?? s.height;
  const corners = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ] as const;
  const sides = ["top", "right", "bottom", "left"] as const;
  const resizePoints = linear
    ? corners
    : textOnly
      ? [...corners, ...sides]
      : s.shape === "triangle"
        ? (["top", "bottom-left", "bottom-right"] as const)
        : s.shape === "diamond" || s.shape === "ellipse"
          ? sides
          : corners;
  const rough =
    s.strokeStyle === "sketch" && s.borderWidth > 0
      ? roughBorderPaths(w, h, s.radius, s.shape)
      : null;
  return (
    <div
      ref={rootRef}
      className={`studio-node shape-${n.imageSrc ? "shape-image" : textOnly ? "shape-text" : s.shape} ${data.highlight ? "highlight" : ""} ${preview ? "is-resizing" : ""} ${data.isNew ? "is-new" : ""}`}
      style={
        {
          width: "100%",
          height: "100%",
          opacity: s.opacity,
          filter: s.shadow ? "drop-shadow(0 8px 12px #16233d28)" : undefined,
          transform: `rotate(${rotationPreview ?? s.rotation ?? 0}deg)`,
          "--node-radius": `${s.radius}px`,
        } as React.CSSProperties
      }
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!n.imageSrc) data.onEdit(id);
      }}
    >
      {selected && !data.readOnly && (
        <>
          {resizePoints.map((corner) => (
            <NodeResizeControl
              key={corner}
              position={corner}
              className="studio-resize-corner"
              minWidth={textOnly ? 60 : 100}
              minHeight={textOnly ? 32 : 55}
              keepAspectRatio={false}
              onResizeStart={(_, params) =>
                setPreview({ width: params.width, height: params.height })
              }
              onResize={(_, params) =>
                setPreview({ width: params.width, height: params.height })
              }
              onResizeEnd={(_, params) => {
                setPreview({ width: params.width, height: params.height });
                data.onResize(
                  id,
                  params.x,
                  params.y,
                  params.width,
                  params.height,
                );
              }}
            />
          ))}
          {linear && (
            <button
              className="arrow-rotate-handle nodrag"
              title="Drag to rotate"
              onPointerDown={(event) => {
                event.stopPropagation();
                const rect = rootRef.current?.getBoundingClientRect();
                if (!rect) return;
                const centerX = rect.left + rect.width / 2,
                  centerY = rect.top + rect.height / 2;
                rotateGesture.current = {
                  centerX,
                  centerY,
                  startAngle: Math.atan2(
                    event.clientY - centerY,
                    event.clientX - centerX,
                  ),
                  startRotation: s.rotation ?? 0,
                  currentRotation: s.rotation ?? 0,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const gesture = rotateGesture.current;
                if (!gesture) return;
                const angle = Math.atan2(
                  event.clientY - gesture.centerY,
                  event.clientX - gesture.centerX,
                );
                gesture.currentRotation = Math.round(
                  gesture.startRotation +
                    ((angle - gesture.startAngle) * 180) / Math.PI,
                );
                setRotationPreview(gesture.currentRotation);
              }}
              onPointerUp={(event) => {
                if (!rotateGesture.current) return;
                event.currentTarget.releasePointerCapture(event.pointerId);
                const rotation = rotateGesture.current.currentRotation;
                rotateGesture.current = null;
                setRotationPreview(null);
                data.onRotate(id, rotation);
              }}
              onPointerCancel={() => {
                rotateGesture.current = null;
                setRotationPreview(null);
              }}
            />
          )}
          {linear && (
            <button
              className="line-curve-handle nodrag"
              title="Drag to bend the line"
              style={{
                left: `${(curvePreview?.x ?? s.curveX ?? 0.5) * 100}%`,
                top: `${(curvePreview?.y ?? s.curveY ?? 0.5) * 100}%`,
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId))
                  return;
                const rect = rootRef.current?.getBoundingClientRect();
                if (!rect) return;
                const viewport = rootRef.current?.closest(
                  ".react-flow__viewport",
                );
                const matrix = viewport
                  ? new DOMMatrix(getComputedStyle(viewport).transform)
                  : new DOMMatrix();
                const scale = matrix.a || 1;
                const angle =
                  -((rotationPreview ?? s.rotation ?? 0) * Math.PI) / 180;
                const dx =
                  (event.clientX - (rect.left + rect.width / 2)) / scale;
                const dy =
                  (event.clientY - (rect.top + rect.height / 2)) / scale;
                const localX =
                  dx * Math.cos(angle) - dy * Math.sin(angle) + w / 2;
                const localY =
                  dx * Math.sin(angle) + dy * Math.cos(angle) + h / 2;
                setCurvePreview({
                  x: Math.max(0.05, Math.min(0.95, localX / w)),
                  y: Math.max(-1.5, Math.min(2.5, localY / h)),
                });
              }}
              onPointerUp={(event) => {
                if (!curvePreview) return;
                event.currentTarget.releasePointerCapture(event.pointerId);
                data.onCurve(id, curvePreview.x, curvePreview.y);
                setCurvePreview(null);
              }}
              onPointerCancel={() => setCurvePreview(null)}
            />
          )}
        </>
      )}
      {preview && (
        <div className="resize-metric">
          {Math.round(preview.width)} × {Math.round(preview.height)}
        </div>
      )}
      {n.imageSrc ? (
        <img
          className="node-image"
          src={n.imageSrc}
          alt={n.title}
          draggable={false}
        />
      ) : linear ? (
        <svg
          className="arrow-face"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`arrow-head-${id}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill={s.borderColor} />
            </marker>
          </defs>
          <path
            d={`M 6 ${h / 2} Q ${(curvePreview?.x ?? s.curveX ?? 0.5) * w} ${(curvePreview?.y ?? s.curveY ?? 0.5) * h} ${w - 10} ${h / 2}`}
            fill="none"
            stroke={s.borderColor}
            strokeWidth={Math.max(1, s.borderWidth || 4)}
            strokeLinecap="round"
            markerEnd={arrow ? `url(#arrow-head-${id})` : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {n.lineLabel && (
            <text
              x={w / 2}
              y={h / 2 - 7}
              textAnchor="middle"
              className="editable-line-label"
              fill={n.lineLabelColor ?? "#000000"}
            >
              {n.lineLabel}
            </text>
          )}
        </svg>
      ) : (
        <div
          className={`node-face ${geometric ? "geometric " + s.shape : ""}`}
          style={{
            background: s.background,
            backgroundImage: artBackgroundImage(s.artStyle, s.patternColor),
            borderWidth: rough || geometric ? 0 : s.borderWidth,
            borderStyle:
              s.strokeStyle === "sketch" ? "solid" : (s.strokeStyle ?? "solid"),
            borderColor: s.borderColor,
            borderRadius:
              s.shape === "ellipse"
                ? "50%"
                : geometric
                  ? 0
                  : s.shape === "rectangle"
                    ? 0
                    : s.radius,
          }}
        >
          <div
            className="node-content"
            style={{
              fontFamily: s.fontFamily,
              fontSize:
                textOnly && preview
                  ? Math.max(
                      8,
                      Math.min(
                        160,
                        s.fontSize *
                          Math.sqrt(
                            ((preview.width / s.width) * preview.height) /
                              s.height,
                          ),
                      ),
                    )
                  : s.fontSize,
              fontWeight: s.bold ? 700 : 400,
              fontStyle: s.italic ? "italic" : "normal",
              textDecoration: s.underline ? "underline" : "none",
              color: s.textColor,
              textAlign: s.textAlign,
              padding:
                textOnly && preview
                  ? s.padding *
                    Math.sqrt(
                      ((preview.width / s.width) * preview.height) / s.height,
                    )
                  : s.padding,
              justifyContent:
                s.verticalAlign === "top"
                  ? "flex-start"
                  : s.verticalAlign === "bottom"
                    ? "flex-end"
                    : "center",
            }}
          >
            {(n.title || data.editing) && (
              <strong
                ref={titleRef}
                className={data.editing ? "nodrag inline-title-editor" : ""}
                contentEditable={data.editing}
                suppressContentEditableWarning
                onBlur={(event) =>
                  data.onInlineSave(id, event.currentTarget.textContent ?? "")
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    event.currentTarget.textContent = n.title;
                    event.currentTarget.blur();
                  }
                }}
              >
                {n.title}
              </strong>
            )}
            {n.text && <span>{n.text}</span>}
            {n.note && <small className="note-date">{n.noteDate}</small>}
          </div>
        </div>
      )}
      {!n.imageSrc && !linear && geometric && !rough && s.borderWidth > 0 && (
        <svg
          className="geometric-border"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points={
              s.shape === "triangle"
                ? `${w / 2},2 ${w - 2},${h - 2} 2,${h - 2}`
                : `${w / 2},2 ${w - 2},${h / 2} ${w / 2},${h - 2} 2,${h / 2}`
            }
            fill="none"
            stroke={s.borderColor}
            strokeWidth={s.borderWidth}
            strokeDasharray={strokeDasharray(s.strokeStyle ?? "solid")}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {!n.imageSrc && !linear && rough && (
        <svg
          className="rough-border"
          viewBox={`0 0 ${preview?.width ?? s.width} ${preview?.height ?? s.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={rough[0]}
            stroke={s.borderColor}
            strokeWidth={Math.max(1, s.borderWidth * 0.65)}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={rough[1]}
            stroke={s.borderColor}
            strokeWidth={Math.max(0.8, s.borderWidth * 0.38)}
            opacity=".7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {!textOnly && !linear && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            className="node-handle"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            className="node-handle"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-source"
            className="node-handle"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-target"
            className="node-handle"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left-source"
            className="node-handle"
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top-source"
            className="node-handle"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            className="node-handle"
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-target"
            className="node-handle"
          />
        </>
      )}
      {data.children > 0 && !data.readOnly && (
        <button
          className="collapse-badge nodrag"
          title={
            n.collapsed ? `Show ${data.hidden} hidden nodes` : "Collapse branch"
          }
          onClick={(e) => {
            e.stopPropagation();
            data.onToggle(id);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {n.collapsed ? `+ ${data.hidden}` : "−"}
        </button>
      )}
    </div>
  );
}
