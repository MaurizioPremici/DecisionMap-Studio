import type { ArtStyle, MapNode } from "./types";
import { DEFAULT_PATTERN_COLOR } from "./runtime";

export type PatternStyle = "none" | "grid" | "horizontal";

export const ART_STYLE_PRESETS: { id: PatternStyle; name: string }[] = [
  { id: "none", name: "None" },
  { id: "grid", name: "Grid" },
  { id: "horizontal", name: "Horizontal lines" },
];

export function normalizeArtStyle(style: ArtStyle | undefined): PatternStyle {
  if (style === "hatch-gold" || style === "hatch-green") return "grid";
  if (style === "chalk-blue") return "grid";
  if (style === "paper-ink" || style === "diagonal") return "horizontal";
  return style === "grid" || style === "horizontal" ? style : "none";
}

export function patternColorFor(
  style: ArtStyle | undefined,
  color?: string,
): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (style === "hatch-gold") return "#9c702d";
  if (style === "hatch-green") return "#398454";
  if (style === "chalk-blue") return "#a9c4d3";
  if (style === "paper-ink") return "#81684b";
  return DEFAULT_PATTERN_COLOR;
}

export function artBackgroundImage(
  style: ArtStyle | undefined,
  color?: string,
): string | undefined {
  const pattern = normalizeArtStyle(style);
  const ink = patternColorFor(style, color);
  if (pattern === "grid")
    return `repeating-linear-gradient(0deg,transparent 0 19px,${ink}55 19px 20px),repeating-linear-gradient(90deg,transparent 0 19px,${ink}55 19px 20px)`;
  if (pattern === "horizontal")
    return `repeating-linear-gradient(0deg,transparent 0 23px,${ink}66 23px 24px)`;
  return undefined;
}

export function artPatternId(
  style: ArtStyle | undefined,
  color?: string,
): string | undefined {
  const pattern = normalizeArtStyle(style);
  return pattern === "none"
    ? undefined
    : `art-${pattern}-${patternColorFor(style, color).slice(1)}`;
}

export function artSvgPatterns(nodes: MapNode[]): string {
  const used = new Map<string, { pattern: PatternStyle; color: string }>();
  for (const node of nodes) {
    const pattern = normalizeArtStyle(node.style.artStyle);
    if (pattern === "none") continue;
    const color = patternColorFor(node.style.artStyle, node.style.patternColor);
    used.set(artPatternId(pattern, color)!, { pattern, color });
  }
  return [...used]
    .map(([id, { pattern, color }]) => {
      const size = pattern === "grid" ? 20 : 24;
      const geometry =
        pattern === "grid" ? `M0 0H${size}M0 0V${size}` : `M0 0H${size}`;
      return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="${geometry}" fill="none" stroke="${color}" stroke-width="1" opacity=".34"/></pattern>`;
    })
    .join("");
}
