import { validateDocument } from "./tree";
import type { MapDocument, NodeStyle, ProjectIndex } from "../types";
const KEY = "decision-map-studio-projects-v1";
const STYLE_KEY = "decision-map-studio-saved-styles-v1";
export interface SavedNodeStyle {
  id: string;
  name: string;
  style: NodeStyle;
}
export function loadSavedStyles(): SavedNodeStyle[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STYLE_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is SavedNodeStyle =>
          Boolean(
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            item.style &&
            typeof item.style === "object" &&
            typeof item.style.shape === "string",
          ),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveSavedStyles(styles: SavedNodeStyle[]): string | null {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(styles));
    return null;
  } catch {
    return "Saved styles could not be stored locally.";
  }
}
export function loadProjects(): ProjectIndex {
  try {
    const data = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    ) as ProjectIndex;
    if (data?.version === 1 && Array.isArray(data.projects)) {
      data.projects.forEach(validateDocument);
      let updated = false;
      const projects = data.projects.map((project) => ({
        ...project,
        nodes: project.nodes.map((node) => {
          if (node.style.shape !== "rounded" || node.style.radius !== 16)
            return node;
          updated = true;
          return { ...node, style: { ...node.style, radius: 26 } };
        }),
      }));
      const result = { ...data, projects };
      if (updated) saveProjects(result);
      return result;
    }
  } catch {
    /** start clean */
  }
  return { version: 1, activeId: null, projects: [] };
}
export function saveProjects(data: ProjectIndex) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return null;
  } catch {
    return "Local storage is unavailable. Export the project as JSON to keep it.";
  }
}
export function download(filename: string, content: string, mime: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function markdown(doc: MapDocument) {
  const lines = [`# ${doc.name}`, ""];
  const walk = (parent: string | null, depth: number) => {
    for (const n of doc.nodes.filter((x) => x.parentId === parent)) {
      lines.push(
        `${"  ".repeat(depth)}- **${n.title}**${n.text ? ` — ${n.text.replace(/\n/g, " ")}` : ""}`,
      );
      if (n.description)
        lines.push(`${"  ".repeat(depth + 1)}${n.description}`);
      walk(n.id, depth + 1);
    }
  };
  walk(null, 0);
  if (doc.links.length) {
    lines.push("", "## Reference connections");
    for (const e of doc.links)
      lines.push(
        `- ${doc.nodes.find((n) => n.id === e.source)?.title} → ${doc.nodes.find((n) => n.id === e.target)?.title}${e.label ? `: ${e.label}` : ""}`,
      );
  }
  return lines.join("\n");
}
