export type Shape =
  | "rectangle"
  | "rounded"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "line"
  | "arrow";
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type Direction = "LR" | "TB" | "RL" | "BT" | "free";
export type LineType = "straight" | "smoothstep" | "default";
export type StrokeStyle = "solid" | "dashed" | "dotted" | "sketch";
export type LineAnimationMode = "none" | "flow" | "blink" | "pulse";
export interface LineAnimation {
  mode: LineAnimationMode;
  color: string;
  speed: number;
  duration: number;
}
export type ArtStyle =
  | "none"
  | "crosshatch"
  | "grid"
  | "diagonal"
  | "horizontal"
  | "hatch-gold"
  | "hatch-green"
  | "chalk-blue"
  | "paper-ink";
export type DarkTheme =
  | "slate"
  | "graphite"
  | "ink"
  | "dracula"
  | "midnight"
  | "navy"
  | "forest"
  | "olive"
  | "wine"
  | "plum"
  | "espresso";
export interface NodeStyle {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textColor: string;
  textAlign: Align;
  verticalAlign: VAlign;
  padding: number;
  background: string;
  borderColor: string;
  borderWidth: number;
  strokeStyle?: StrokeStyle;
  artStyle?: ArtStyle;
  patternColor?: string;
  radius: number;
  opacity: number;
  shadow: boolean;
  shape: Shape;
  autoSize: boolean;
  width: number;
  height: number;
  rotation?: number;
  curveX?: number;
  curveY?: number;
}
export interface MapNode {
  id: string;
  title: string;
  description: string;
  text: string;
  imageSrc?: string;
  textOnly?: boolean;
  note?: boolean;
  noteDate?: string;
  parentId: string | null;
  parentLineStyle?: StrokeStyle;
  parentLineType?: LineType;
  parentLineWidth?: number;
  parentLineColor?: string;
  parentAnimation?: LineAnimation;
  position: { x: number; y: number };
  style: NodeStyle;
  collapsed: boolean;
}
export interface MapLink {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  kind: "reference";
  label: string;
  labelFontSize?: number;
  labelColor?: string;
  color: string;
  arrowColor?: string;
  width: number;
  dashed: boolean;
  strokeStyle?: StrokeStyle;
  type: LineType;
  arrow: boolean;
  animation?: LineAnimation;
}
export interface MapStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}
export interface MapSettings {
  theme: "light" | "dark";
  darkTheme?: DarkTheme;
  grid: boolean;
  snap: boolean;
  minimap: boolean;
  locked?: boolean;
  direction: Direction;
  horizontalGap: number;
  verticalGap: number;
  nodeGap: number;
}
export interface MapDocument {
  version: 1;
  id: string;
  name: string;
  nodes: MapNode[];
  links: MapLink[];
  strokes?: MapStroke[];
  settings: MapSettings;
  updatedAt: string;
}
export interface ProjectIndex {
  version: 1;
  activeId: string | null;
  projects: MapDocument[];
}
export const DEFAULT_STYLE: NodeStyle = {
  fontFamily: "Bodoni Moda, Georgia, serif",
  fontSize: 34,
  bold: false,
  italic: false,
  underline: false,
  textColor: "#25304a",
  textAlign: "center",
  verticalAlign: "middle",
  padding: 16,
  background: "#ffffff",
  borderColor: "#8996b6",
  borderWidth: 2,
  strokeStyle: "solid",
  artStyle: "none",
  patternColor: "#a47b4c",
  radius: 26,
  opacity: 1,
  shadow: true,
  shape: "rounded",
  autoSize: false,
  width: 210,
  height: 112,
};
export const DEFAULT_SETTINGS: MapSettings = {
  theme: "dark",
  darkTheme: "dracula",
  grid: true,
  snap: false,
  minimap: true,
  direction: "LR",
  horizontalGap: 110,
  verticalGap: 58,
  nodeGap: 42,
};
export const DEFAULT_PARENT_ANIMATION: LineAnimation = {
  mode: "flow",
  color: "#bd93f9",
  speed: 1,
  duration: 1,
};
export const DEFAULT_LINK_ANIMATION: LineAnimation = {
  mode: "none",
  color: "#bd93f9",
  speed: 1,
  duration: 1,
};
export const uid = () => crypto.randomUUID();
export function emptyProject(name = "Senza titolo"): MapDocument {
  return {
    version: 1,
    id: uid(),
    name,
    nodes: [],
    links: [],
    strokes: [],
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: new Date().toISOString(),
  };
}
export function demoProject(): MapDocument {
  const p = emptyProject("Mappa dimostrativa");
  const make = (
    title: string,
    parentId: string | null,
    x: number,
    y: number,
  ): MapNode => ({
    id: uid(),
    title,
    description: "",
    text: "",
    parentId,
    position: { x, y },
    style: { ...DEFAULT_STYLE },
    collapsed: false,
  });
  const root = make("Idea principale", null, 80, 220);
  root.style = {
    ...root.style,
    background: "#dce9ff",
    borderColor: "#5978ca",
    bold: true,
  };
  const a = make("Ricerca", root.id, 420, 80);
  const b = make("Progettazione", root.id, 420, 270);
  const c = make("Revisione", root.id, 420, 460);
  const d = make("Raccogli fonti", a.id, 760, 30);
  const e = make("Valuta alternative", a.id, 760, 180);
  p.nodes = [root, a, b, c, d, e];
  return p;
}
