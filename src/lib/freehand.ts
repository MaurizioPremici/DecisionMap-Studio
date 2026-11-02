import type { MapStroke } from "../types";

export function freehandPath(points: MapStroke["points"]) {
  if (!points.length) return "";
  const fmt = (n: number) => Math.round(n * 10) / 10;
  if (points.length === 1)
    return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[0].x + 0.01)} ${fmt(points[0].y)}`;
  let path = `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    path += ` Q ${fmt(points[i].x)} ${fmt(points[i].y)} ${fmt(mid.x)} ${fmt(mid.y)}`;
  }
  const last = points[points.length - 1];
  path += ` L ${fmt(last.x)} ${fmt(last.y)}`;
  return path;
}

type Point = MapStroke["points"][number];

function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(
          1,
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
        ),
      )
    : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

export function eraseFreehandStrokes(
  strokes: MapStroke[],
  eraserPath: Point[],
  radius: number,
  gestureId: string,
): MapStroke[] {
  if (!eraserPath.length || !strokes.length) return strokes;
  let changed = false;
  const result: MapStroke[] = [];
  for (const stroke of strokes) {
    if (!stroke.points.length) {
      result.push(stroke);
      continue;
    }
    const threshold = radius + stroke.width / 2;
    const nearEraser = (point: Point) =>
      eraserPath.length === 1
        ? Math.hypot(point.x - eraserPath[0].x, point.y - eraserPath[0].y) <=
          threshold
        : eraserPath.some(
            (start, index) =>
              index < eraserPath.length - 1 &&
              distanceToSegment(point, start, eraserPath[index + 1]) <=
                threshold,
          );
    const samples: Point[] = [stroke.points[0]];
    const step = Math.max(1.5, Math.min(5, radius / 3));
    for (let i = 1; i < stroke.points.length; i++) {
      const a = stroke.points[i - 1],
        b = stroke.points[i];
      const count = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step),
      );
      for (let j = 1; j <= count; j++)
        samples.push({
          x: a.x + ((b.x - a.x) * j) / count,
          y: a.y + ((b.y - a.y) * j) / count,
        });
    }
    const erased = samples.map(nearEraser);
    if (!erased.some(Boolean)) {
      result.push(stroke);
      continue;
    }
    changed = true;
    let run: Point[] = [];
    let part = 0;
    const flush = () => {
      if (
        run.length > 1 &&
        Math.hypot(run.at(-1)!.x - run[0].x, run.at(-1)!.y - run[0].y) >= 2
      ) {
        result.push({
          ...stroke,
          id:
            part++ === 0
              ? stroke.id
              : `${stroke.id}:erase:${gestureId}:${part}`,
          points: run,
        });
      }
      run = [];
    };
    for (let i = 0; i < samples.length; i++) {
      if (erased[i]) flush();
      else run.push(samples[i]);
    }
    flush();
  }
  return changed ? result : strokes;
}
