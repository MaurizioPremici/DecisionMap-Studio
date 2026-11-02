import {
  DEFAULT_STYLE,
  emptyProject,
  uid,
  type MapDocument,
  type MapNode,
} from "../types";

type StudyTemplate = {
  id: string;
  name: string;
  purpose: string;
  focus: string;
  branches: readonly (readonly [string, string])[];
};

// These are prompts and empty spaces, not prewritten course material.
export const STUDY_TEMPLATES: readonly StudyTemplate[] = [
  {
    id: "concept",
    name: "Concept recall",
    purpose: "Understand and remember one technical concept.",
    focus: "[Concept]",
    branches: [
      ["Meaning", "[Explain it without notes]"],
      ["Purpose", "[When is it useful?]"],
      ["Mechanism", "[Draw or describe the steps]"],
      ["Example", "[Make your own example]"],
      ["Recall check", "[What can you recall tomorrow?]"],
    ],
  },
] as const;

export function createStudyProject(templateId: string): MapDocument {
  const template = STUDY_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error("Unknown study template");
  const project = emptyProject(template.name);
  const makeNode = (
    title: string,
    parentId: string | null,
    x: number,
    y: number,
    kind: "focus" | "branch" | "answer",
  ): MapNode => ({
    id: uid(),
    title,
    text: "",
    description: "",
    parentId,
    parentLineType: "default",
    parentLineWidth: 4,
    position: { x, y },
    collapsed: false,
    style: {
      ...DEFAULT_STYLE,
      width: kind === "answer" ? 270 : 240,
      height: kind === "answer" ? 100 : 110,
      fontSize: kind === "focus" ? 27 : kind === "branch" ? 24 : 20,
      fontFamily: "Inter, system-ui, sans-serif",
      bold: kind !== "answer",
      background:
        kind === "focus"
          ? "#ded7fa"
          : kind === "branch"
            ? "#e4eaff"
            : "#ffffff",
      borderColor:
        kind === "focus"
          ? "#8274bf"
          : kind === "branch"
            ? "#8996b6"
            : "#a3abc0",
      textColor: "#25304a",
      radius: 20,
      shadow: false,
    },
  });
  const focus = makeNode(template.focus, null, 60, 380, "focus");
  project.nodes.push(focus);
  template.branches.forEach(([title, prompt], index) => {
    const y = 60 + index * 160;
    const branch = makeNode(title, focus.id, 410, y, "branch");
    const answer = makeNode(prompt, branch.id, 760, y + 5, "answer");
    project.nodes.push(branch, answer);
  });
  return project;
}
