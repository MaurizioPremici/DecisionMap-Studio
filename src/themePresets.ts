import type { DarkTheme } from "./types";

type Palette = {
  id: DarkTheme;
  name: string;
  bg: string;
  panel: string;
  control: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  grid: string;
  edge: string;
};

export const DARK_THEME_PRESETS: Palette[] = [
  {
    id: "slate",
    name: "Slate",
    bg: "#1d2230",
    panel: "#292f40",
    control: "#333a4d",
    ink: "#f1f2fa",
    muted: "#a6afc3",
    line: "#3b4254",
    accent: "#a9a3dc",
    grid: "#3a435a",
    edge: "#7986b8",
  },
  {
    id: "graphite",
    name: "Graphite",
    bg: "#202124",
    panel: "#2c2d31",
    control: "#37383d",
    ink: "#eeeff0",
    muted: "#a9abb0",
    line: "#45474c",
    accent: "#b1b5bc",
    grid: "#3b3d42",
    edge: "#92969f",
  },
  {
    id: "ink",
    name: "Ink",
    bg: "#171c24",
    panel: "#232a35",
    control: "#2d3643",
    ink: "#edf0f4",
    muted: "#a4acb8",
    line: "#3b4655",
    accent: "#9cb1c6",
    grid: "#323e4c",
    edge: "#8194a9",
  },
  {
    id: "dracula",
    name: "Dracula",
    bg: "#282a36",
    panel: "#343746",
    control: "#414456",
    ink: "#f8f8f2",
    muted: "#b6b8c6",
    line: "#505466",
    accent: "#bd93f9",
    grid: "#3f4254",
    edge: "#a68bc6",
  },
];

export function darkPalette(id: DarkTheme | undefined) {
  return DARK_THEME_PRESETS.find((p) => p.id === id) ?? DARK_THEME_PRESETS[0];
}
