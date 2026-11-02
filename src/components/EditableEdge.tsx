import { useState, type PointerEvent } from "react";
import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

export type EditableEdgeData = {
  pathType: "default" | "straight" | "smoothstep";
  controlPoint?: { x: number; y: number };
  onControlPoint: (id: string, point: { x: number; y: number }) => void;
  locked?: boolean;
};

export function EditableEdge(props: EdgeProps) {
  const data = props.data as EditableEdgeData | undefined;
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const point = drag ?? data?.controlPoint;
  const centerX = point?.x ?? (props.sourceX + props.targetX) / 2;
  const centerY = point?.y ?? (props.sourceY + props.targetY) / 2;
  const d = point
    ? `M ${props.sourceX} ${props.sourceY} Q ${2 * centerX - (props.sourceX + props.targetX) / 2} ${2 * centerY - (props.sourceY + props.targetY) / 2} ${props.targetX} ${props.targetY}`
    : data?.pathType === "straight"
      ? getStraightPath(props)[0]
      : data?.pathType === "smoothstep"
        ? getSmoothStepPath(props)[0]
        : getBezierPath(props)[0];
  const move = (event: PointerEvent<SVGCircleElement>) => {
    if (!drag) return;
    setDrag(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };
  return (
    <>
      <BaseEdge
        id={props.id}
        path={d}
        markerStart={props.markerStart}
        markerEnd={props.markerEnd}
        style={props.style}
        interactionWidth={props.interactionWidth}
      />
      {props.label && (
        <text
          x={centerX}
          y={centerY - 9}
          textAnchor="middle"
          style={props.labelStyle}
          className="edge-label-text"
        >
          {String(props.label)}
        </text>
      )}
      {props.selected && !data?.locked && (
        <circle
          className="edge-control nodrag nopan"
          cx={centerX}
          cy={centerY}
          r={8}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ x: centerX, y: centerY });
          }}
          onPointerMove={move}
          onPointerUp={(event) => {
            event.stopPropagation();
            if (drag)
              data?.onControlPoint(
                props.id,
                screenToFlowPosition({ x: event.clientX, y: event.clientY }),
              );
            setDrag(null);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            data?.onControlPoint(props.id, {
              x: (props.sourceX + props.targetX) / 2,
              y: (props.sourceY + props.targetY) / 2,
            });
          }}
        />
      )}
    </>
  );
}
