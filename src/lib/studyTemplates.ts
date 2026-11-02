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
  {
    id: "algorithm",
    name: "Algorithm walkthrough",
    purpose: "Trace, test, and recall an algorithm.",
    focus: "[Algorithm]",
    branches: [
      ["Goal", "[What problem does it solve?]"],
      ["Inputs & output", "[List the data and result]"],
      ["Trace", "[Work through one example by hand]"],
      ["Edge cases", "[Which inputs might break it?]"],
      ["Recall check", "[Rebuild the steps from memory]"],
    ],
  },
  {
    id: "architecture",
    name: "System architecture",
    purpose: "Map components and their responsibilities.",
    focus: "[System]",
    branches: [
      ["Components", "[Name each part]"],
      ["Data flow", "[Trace one request or event]"],
      ["Boundaries", "[Where does trust or ownership change?]"],
      ["Failure modes", "[What can fail and how?]"],
      ["Recall check", "[Redraw the system from memory]"],
    ],
  },
  {
    id: "protocol",
    name: "Protocol or API",
    purpose: "Remember a sequence of messages and states.",
    focus: "[Protocol / API]",
    branches: [
      ["Actors", "[Who communicates?]"],
      ["Sequence", "[Sketch the message order]"],
      ["State", "[What changes at each step?]"],
      ["Errors", "[What happens when a step fails?]"],
      ["Recall check", "[Explain the flow without notes]"],
    ],
  },
  {
    id: "lab",
    name: "Hands-on lab",
    purpose: "Turn practice into reusable memory.",
    focus: "[Lab / exercise]",
    branches: [
      ["Objective", "[What will you demonstrate?]"],
      ["Setup", "[Record tools and environment]"],
      ["Observations", "[What did you actually see?]"],
      ["Result", "[What worked or failed?]"],
      ["Retest", "[Repeat from memory later]"],
    ],
  },
  {
    id: "pentest",
    name: "Penetration test study",
    purpose: "Organize an authorized assessment and its evidence.",
    focus: "[Authorized assessment]",
    branches: [
      ["Scope & rules", "[Record permitted targets and limits]"],
      ["Hypotheses", "[What are you trying to verify?]"],
      ["Evidence", "[Record observations and sources]"],
      ["Validation", "[How will you rule out false positives?]"],
      ["Report & recall", "[Summarize and explain from memory]"],
    ],
  },
  {
    id: "red-team",
    name: "Red team exercise",
    purpose: "Plan and review a controlled simulation.",
    focus: "[Exercise]",
    branches: [
      ["Authorization", "[Scope, rules, and stop conditions]"],
      ["Objective", "[What is being measured?]"],
      ["Assumptions", "[What must be true?]"],
      ["Observations", "[What was detected or missed?]"],
      ["Debrief", "[Lessons and recall questions]"],
    ],
  },
  {
    id: "threat-model",
    name: "Threat model",
    purpose: "Reason about a system without losing assumptions.",
    focus: "[System / feature]",
    branches: [
      ["Assets", "[What needs protection?]"],
      ["Trust boundaries", "[Where does control change?]"],
      ["Scenarios", "[List testable hypotheses]"],
      ["Mitigations", "[What could reduce each risk?]"],
      ["Review", "[Which assumptions need checking?]"],
    ],
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    purpose: "Keep diagnosis separate from guesses.",
    focus: "[Problem]",
    branches: [
      ["Symptoms", "[What is directly observed?]"],
      ["Hypotheses", "[List possible causes]"],
      ["Tests", "[What would distinguish them?]"],
      ["Resolution", "[Record the verified fix]"],
      ["Recall check", "[How would you diagnose it again?]"],
    ],
  },
  {
    id: "spaced-recall",
    name: "Spaced recall",
    purpose: "Review a topic with active recall over time.",
    focus: "[Topic to remember]",
    branches: [
      ["Core question", "[Answer without looking]"],
      ["Explain simply", "[Teach it in your own words]"],
      ["Apply", "[Create a new example]"],
      ["Weak spots", "[What did you forget?]"],
      ["Next review", "[Date and questions to retry]"],
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
