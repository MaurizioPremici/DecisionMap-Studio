import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { exportGraphic } from "./lib/exportGraphics";
import { darkPalette } from "./themePresets";
import { ChevronDown, PanelRightOpen, Moon, Sun } from "lucide-react";
import { EditorCanvas } from "./components/EditorCanvas";
import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ContextMenu } from "./components/ContextMenu";
import { ProjectDialog } from "./components/ProjectDialog";
import { ExportDialog } from "./components/ExportDialog";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { useHistory } from "./hooks/useHistory";
import { autoLayout } from "./lib/layout";
import {
  autoHeight,
  addNode,
  addParent,
  deleteNode,
  descendants,
  duplicate,
  isAncestor,
  removeConnection,
  setBranch,
  validateDocument,
} from "./lib/tree";
import {
  download,
  loadProjects,
  loadSavedStyles,
  markdown,
  saveProjects,
  saveSavedStyles,
  type SavedNodeStyle,
} from "./lib/storage";
import { createStudyProject } from "./lib/studyTemplates";
import {
  demoProject,
  emptyProject,
  uid,
  type DarkTheme,
  type Direction,
  type MapDocument,
  type MapLink,
  type MapNode,
  type MapStroke,
  type NodeStyle,
} from "./types";

const firstIndex = loadProjects();
const savedFirst = firstIndex.projects.find(
  (p) => p.id === firstIndex.activeId,
);
const RECOVERY_KEY = "decision-map-studio-recovery-v1";
const recoveryFirst = (() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(RECOVERY_KEY) || "null",
    ) as MapDocument | null;
    if (saved) validateDocument(saved);
    return saved;
  } catch {
    return null;
  }
})();
const first = (() => {
  if (!savedFirst) return recoveryFirst ?? emptyProject();
  try {
    const key = "decision-map-studio-dracula-default-v1";
    if (localStorage.getItem(key) !== "1") {
      localStorage.setItem(key, "1");
      return {
        ...savedFirst,
        settings: {
          ...savedFirst.settings,
          theme: "dark" as const,
          darkTheme: "dracula" as const,
        },
      };
    }
  } catch {
    /** local preferences unavailable */
  }
  return savedFirst;
})();
const BARS_KEY = "decision-map-studio-hide-bars-v1";
const IMAGE_LIBRARY_KEY = "decision-map-studio-image-library-v1";
type ImageAsset = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
};
function loadImageLibrary(): ImageAsset[] {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_LIBRARY_KEY) || "[]");
  } catch {
    return [];
  }
}
function initialBarsHidden() {
  try {
    return localStorage.getItem(BARS_KEY) === "1";
  } catch {
    return false;
  }
}
type Menu = {
  x: number;
  y: number;
  nodeId: string | null;
  position: { x: number; y: number };
  bounds: { left: number; top: number; right: number; bottom: number };
};
export default function App({ initialDocument, onDocumentChange, embedded = false, pluginMode = false }: {
  initialDocument?: MapDocument;
  onDocumentChange?: (doc: MapDocument) => void;
  embedded?: boolean;
  pluginMode?: boolean;
} = {}) {
  const {
    doc,
    commit: commitRaw,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history,
    jumpTo,
  } = useHistory(initialDocument ?? first);
  const [projects, setProjects] = useState<MapDocument[]>(
    initialDocument ? [initialDocument] : firstIndex.projects.length
      ? firstIndex.projects
      : recoveryFirst
        ? [recoveryFirst]
        : [],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [selectedStroke, setSelectedStroke] = useState<string | null>(null);
  const [savedStyles, setSavedStyles] =
    useState<SavedNodeStyle[]>(loadSavedStyles);
  const [openingEdges, setOpeningEdges] = useState<string[]>([]);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [workspacePanel, setWorkspacePanel] = useState<
    "layers" | "history" | "settings" | null
  >(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exportArea, setExportArea] = useState<
    "all" | "selected" | "rectangle"
  >("all");
  const [exportSelecting, setExportSelecting] = useState(false);
  const [exportRect, setExportRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [barsHidden, setBarsHidden] = useState(initialBarsHidden);
  const [dialog, setDialog] = useState(
    !initialDocument && firstIndex.projects.length === 0 && !recoveryFirst,
  );
  const [exportDialog, setExportDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [mode, setMode] = useState<
    "select" | "connect" | "pan" | "draw" | "erase" | "rectangle"
  >("select");
  const [drawColor, setDrawColor] = useState("#8373cf");
  const [drawWidth, setDrawWidth] = useState(4);
  const [eraserSize, setEraserSize] = useState(24);
  const [search, setSearch] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);
  const [newNodeId, setNewNodeId] = useState<string | null>(null);
  const [fitToken, setFitToken] = useState(0);
  const [notice, setNotice] = useState("");
  const [clipboardStyle, setClipboardStyle] = useState<NodeStyle | null>(null);
  const [clipboardNode, setClipboardNode] = useState<MapNode | null>(null);
  const [memoryError, setMemoryError] = useState("");
  const [imageLibrary, setImageLibrary] =
    useState<ImageAsset[]>(loadImageLibrary);
  const docRef = useRef(doc);
  docRef.current = doc;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const menuRef = useRef(menu);
  menuRef.current = menu;
  const locked = Boolean(doc.settings.locked);
  const commit: typeof commitRaw = useCallback(
    (next) => {
      if (!docRef.current.settings.locked) commitRaw(next);
    },
    [commitRaw],
  );
  const toggleLock = useCallback(() => {
    commitRaw((d) => ({
      ...d,
      settings: { ...d.settings, locked: !d.settings.locked },
    }));
    setMode("select");
    setMenu(null);
    setEditingId(null);
  }, [commitRaw]);
  const onStroke = useCallback(
    (stroke: MapStroke) =>
      commit((d) => ({ ...d, strokes: [...(d.strokes ?? []), stroke] })),
    [commit],
  );
  const onEraseStrokes = useCallback(
    (strokes: MapStroke[]) => commit((d) => ({ ...d, strokes })),
    [commit],
  );
  const onEraseElements = useCallback((nodeIds: string[], edgeIds: string[]) => {
    if (!nodeIds.length && !edgeIds.length) return;
    commit((d) => {
      let next = d;
      for (const id of nodeIds) next = deleteNode(next, id, false);
      for (const id of edgeIds) next = removeConnection(next, id);
      return next;
    });
    setSelectedIds([]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
  }, [commit]);
  const onMoveStroke = useCallback(
    (id: string, dx: number, dy: number) =>
      commit((d) => ({
        ...d,
        strokes: (d.strokes ?? []).map((stroke) =>
          stroke.id === id
            ? {
                ...stroke,
                points: stroke.points.map((point) => ({
                  x: Math.round((point.x + dx) * 10) / 10,
                  y: Math.round((point.y + dy) * 10) / 10,
                })),
              }
            : stroke,
        ),
      })),
    [commit],
  );
  const onResizeStroke = useCallback(
    (id: string, points: MapStroke["points"]) =>
      commit((d) => ({
        ...d,
        strokes: (d.strokes ?? []).map((stroke) =>
          stroke.id === id
            ? {
                ...stroke,
                points: points.map((point) => ({
                  x: Math.round(point.x * 10) / 10,
                  y: Math.round(point.y * 10) / 10,
                })),
              }
            : stroke,
        ),
      })),
    [commit],
  );
  const onSelectStroke = useCallback((id: string) => {
    setSelectedIds([]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
    setSelectedStroke(id);
  }, []);
  const updateStroke = useCallback(
    (id: string, patch: Partial<MapStroke>) =>
      commit((d) => ({
        ...d,
        strokes: (d.strokes ?? []).map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      })),
    [commit],
  );
  useEffect(() => {
    if (onDocumentChange) {
      onDocumentChange(doc);
      setSavedAt(new Date().toLocaleTimeString());
      return;
    }
    const next = projects.some((p) => p.id === doc.id)
      ? projects.map((p) => (p.id === doc.id ? doc : p))
      : [...projects, doc];
    setProjects(next);
    const error = saveProjects({
      version: 1,
      activeId: doc.id,
      projects: next,
    });
    setMemoryError(error ?? "");
    if (!error) {
      setSavedAt(new Date().toLocaleTimeString());
      try {
        localStorage.setItem(RECOVERY_KEY, JSON.stringify(doc));
      } catch {
        /* storage full */
      }
    }
  }, [doc]);
  useEffect(() => {
    try {
      localStorage.setItem(BARS_KEY, barsHidden ? "1" : "0");
    } catch {
      /** optional preference */
    }
  }, [barsHidden]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  const selectedNode = doc.nodes.find((n) => n.id === selectedIds[0]) ?? null;
  const stroke = doc.strokes?.find((s) => s.id === selectedStroke) ?? null;
  const link = doc.links.find((e) => e.id === selectedEdge) ?? null;
  const treeChild =
    doc.nodes.find((n) => n.parentId && selectedEdge === `tree-${n.id}`) ??
    null;
  const palette = darkPalette(doc.settings.darkTheme);
  const themeStyle =
    doc.settings.theme === "dark"
      ? ({
          "--bg": palette.bg,
          "--panel": palette.panel,
          "--control": palette.control,
          "--ink": palette.ink,
          "--muted": palette.muted,
          "--line": palette.line,
          "--accent": palette.accent,
          "--selection-frame": palette.accent,
        } as CSSProperties)
      : undefined;
  const select = useCallback(
    (ids: string[], edge: string | null | string[]) => {
      if (ids.length === 1) {
        const groupId = docRef.current.nodes.find(
          (n) => n.id === ids[0],
        )?.groupId;
        if (groupId)
          ids = docRef.current.nodes
            .filter((n) => n.groupId === groupId)
            .map((n) => n.id);
      }
      const edges = Array.isArray(edge) ? edge : edge ? [edge] : [];
      if (ids.length || edges.length) setSelectedStroke(null);
      setSelectedIds((previous) =>
        previous.length === ids.length &&
        previous.every((id, index) => id === ids[index])
          ? previous
          : ids,
      );
      setSelectedEdge(edges[0] ?? null);
      setSelectedEdgeIds(edges);
    },
    [],
  );
  const selectedGroupIds = useMemo(() => {
    const groups = new Set(
      doc.nodes
        .filter((n) => selectedIds.includes(n.id))
        .map((n) => n.groupId)
        .filter(Boolean),
    );
    return groups.size === 1 ? [...groups][0] : undefined;
  }, [doc.nodes, selectedIds]);
  const alignSelection = useCallback(
    (kind: string) => {
      const items = docRef.current.nodes.filter(
        (n) => selectedIdsRef.current.includes(n.id) && !n.locked,
      );
      if (items.length < 2) return;
      const sorted = [...items].sort((a, b) =>
        kind.endsWith("X")
          ? a.position.x - b.position.x
          : a.position.y - b.position.y,
      );
      const minX = Math.min(...items.map((n) => n.position.x));
      const maxX = Math.max(...items.map((n) => n.position.x + n.style.width));
      const minY = Math.min(...items.map((n) => n.position.y));
      const maxY = Math.max(...items.map((n) => n.position.y + n.style.height));
      const gapX =
        (maxX - minX - items.reduce((sum, n) => sum + n.style.width, 0)) /
        (items.length - 1);
      const gapY =
        (maxY - minY - items.reduce((sum, n) => sum + n.style.height, 0)) /
        (items.length - 1);
      const moves = new Map<string, { x: number; y: number }>();
      sorted.forEach((n, i) => {
        const x =
          kind === "left"
            ? minX
            : kind === "centerX"
              ? (minX + maxX - n.style.width) / 2
              : kind === "right"
                ? maxX - n.style.width
                : kind === "distributeX"
                  ? minX +
                    sorted
                      .slice(0, i)
                      .reduce((sum, item) => sum + item.style.width, 0) +
                    gapX * i
                  : n.position.x;
        const y =
          kind === "top"
            ? minY
            : kind === "centerY"
              ? (minY + maxY - n.style.height) / 2
              : kind === "bottom"
                ? maxY - n.style.height
                : kind === "distributeY"
                  ? minY +
                    sorted
                      .slice(0, i)
                      .reduce((sum, item) => sum + item.style.height, 0) +
                    gapY * i
                  : n.position.y;
        moves.set(n.id, { x, y });
      });
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) =>
          moves.has(n.id) ? { ...n, position: moves.get(n.id)! } : n,
        ),
      }));
    },
    [commit],
  );
  const groupSelection = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    const groupId = uid();
    commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (ids.includes(n.id) ? { ...n, groupId } : n)),
    }));
  }, [commit]);
  const ungroupSelection = useCallback(() => {
    if (!selectedGroupIds) return;
    commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) =>
        n.groupId === selectedGroupIds ? { ...n, groupId: undefined } : n,
      ),
    }));
  }, [commit, selectedGroupIds]);
  const add = useCallback(
    (
      parentId: string | null = null,
      position?: { x: number; y: number },
      text = false,
    ) => {
      if (docRef.current.settings.locked) return;
      let next = addNode(docRef.current, parentId, position, "");
      const node = next.nodes.at(-1)!;
      if (text) {
        node.textOnly = true;
        node.style = {
          ...node.style,
          background: "#ffffff00",
          borderWidth: 0,
          shadow: false,
          width: 120,
          height: 54,
          padding: 1,
          fontSize: 34,
          fontFamily: "Bodoni Moda, Georgia, serif",
          textColor:
            docRef.current.settings.theme === "dark" ? "#ffffff" : "#25304a",
        };
      }
      if (
        parentId &&
        !position &&
        next.settings.direction !== "free"
      ) {
        next = autoLayout(next);
      }
      commit(next);
      setNewNodeId(node.id);
      setSelectedIds([node.id]);
      setSelectedEdge(null);
      setSelectedEdgeIds([]);
      if (text) setEditingId(node.id);
      setFitToken((v) => v + 1);
    },
    [commit],
  );
  const addRectangle = useCallback((rect: {x:number;y:number;width:number;height:number}) => {
    if (docRef.current.settings.locked) return;
    const next = addNode(docRef.current, null, {x:rect.x,y:rect.y}, "");
    const node = next.nodes.at(-1)!;
    node.style = {...node.style, shape:"rectangle", autoSize:false, width:rect.width, height:rect.height};
    commit(next);
    setSelectedIds([node.id]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
    setMode("select");
  }, [commit]);
  const addArrow = useCallback(() => {
    if (docRef.current.settings.locked) return;
    const next = addNode(docRef.current, null, undefined, "");
    const node = next.nodes.at(-1)!;
    node.style = {
      ...node.style,
      shape: "arrow",
      width: 180,
      height: 70,
      borderWidth: 7,
      borderColor: "#000000",
      background: "#ffffff00",
      shadow: false,
      rotation: 0,
      curveX: 0.5,
      curveY: 0.5,
    };
    commit(next);
    setNewNodeId(node.id);
    setMode("select");
    setSelectedIds([node.id]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
  }, [commit]);
  const addLine = useCallback(() => {
    if (docRef.current.settings.locked) return;
    const next = addNode(docRef.current, null, undefined, "");
    const node = next.nodes.at(-1)!;
    node.style = {
      ...node.style,
      shape: "line",
      width: 200,
      height: 70,
      borderWidth: 7,
      borderColor: "#000000",
      background: "#ffffff00",
      shadow: false,
      rotation: 0,
      curveX: 0.5,
      curveY: 0.5,
    };
    commit(next);
    setNewNodeId(node.id);
    setMode("select");
    setSelectedIds([node.id]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
  }, [commit]);
  const addNote = useCallback(() => {
    if (docRef.current.settings.locked) return;
    const next = addNode(docRef.current, null, undefined, "");
    const node = next.nodes.at(-1)!;
    node.note = true;
    node.noteDate = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
    }).format(new Date());
    node.style = {
      ...node.style,
      shape: "rounded",
      width: 250,
      height: 270,
      autoSize: false,
      background: "#ffe071",
      borderColor: "#e0bd4d",
      borderWidth: 1,
      radius: 18,
      padding: 22,
      textColor: "#251f12",
      fontSize: 28,
      fontFamily: "Cheri, cursive",
      shadow: true,
    };
    commit(next);
    setNewNodeId(node.id);
    setMode("select");
    setSelectedIds([node.id]);
    setSelectedEdge(null);
    setSelectedEdgeIds([]);
    setEditingId(node.id);
  }, [commit]);
  const placeImageAsset = useCallback(
    (asset: ImageAsset, position?: { x: number; y: number }) => {
      if (docRef.current.settings.locked) return;
      const next = addNode(docRef.current, null, position, asset.name);
      const node = next.nodes.at(-1)!;
      node.imageSrc = asset.src;
      node.style = {
        ...node.style,
        width: asset.width,
        height: asset.height,
        autoSize: false,
        shadow: false,
      };
      commit(next);
      setNewNodeId(node.id);
      setMode("select");
      setSelectedIds([node.id]);
      setSelectedEdge(null);
      setSelectedEdgeIds([]);
      setFitToken((v) => v + 1);
    },
    [commit],
  );
  const addImage = useCallback(
    async (file: File, position?: { x: number; y: number }) => {
      if (docRef.current.settings.locked) return;
      if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) {
        setNotice("Unsupported image format.");
        return;
      }
      try {
        const url = URL.createObjectURL(file);
        let image: HTMLImageElement;
        try {
          image = new Image();
          image.src = url;
          await image.decode();
        } finally {
          URL.revokeObjectURL(url);
        }
        const scale = Math.min(
          1,
          1600 / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Canvas unavailable");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL("image/webp", 0.82);
        const ratio = canvas.width / canvas.height;
        const width = Math.min(420, Math.max(160, canvas.width));
        const height = Math.max(55, Math.round(width / ratio));
        const asset = {
          id: uid(),
          name: file.name,
          src: imageSrc,
          width,
          height,
        };
        try {
          setImageLibrary((current) => {
            const next = [
              asset,
              ...current.filter((item) => item.src !== imageSrc),
            ];
            localStorage.setItem(IMAGE_LIBRARY_KEY, JSON.stringify(next));
            return next;
          });
        } catch {
          setNotice("Image added, but the local library is full.");
        }
        placeImageAsset(asset, position);
      } catch {
        setNotice("Unable to load the image.");
      }
    },
    [placeImageAsset],
  );
  const pasteDesktopImage = useCallback(
    async (position?: { x: number; y: number }) => {
      const item = await window.desktopClipboard?.readImage();
      if (!item) return false;
      let file: File;
      if (item.text) {
        file = new File([item.text], item.name, { type: item.type });
      } else if (item.dataUrl) {
        const blob = await (await fetch(item.dataUrl)).blob();
        file = new File([blob], item.name, { type: item.type });
      } else return false;
      await addImage(file, position);
      return true;
    },
    [addImage],
  );
  const updateNode = useCallback(
    (id: string, patch: Partial<MapNode>) =>
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) => {
          if (n.id !== id) return n;
          if (n.locked && patch.locked !== false) return n;
          if (
            n.parentLineLocked &&
            Object.keys(patch).some(
              (key) =>
                key.startsWith("parentLine") ||
                key === "parentAnimation" ||
                key === "parentControlPoint",
            )
          )
            return n;
          const next = { ...n, ...patch };
          return next.style.autoSize
            ? { ...next, style: { ...next.style, height: autoHeight(next) } }
            : next;
        }),
      })),
    [commit],
  );
  const saveInlineText = useCallback(
    (id: string, title: string) => {
      updateNode(id, { title });
      setEditingId(null);
    },
    [updateNode],
  );
  const updateStyle = useCallback(
    (id: string, patch: Partial<NodeStyle>) =>
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) => {
          const anchor = d.nodes.find((item) => item.id === id);
          if (n.id !== id && (!anchor?.groupId || n.groupId !== anchor.groupId))
            return n;
          if (n.locked) return n;
          const next = { ...n, style: { ...n.style, ...patch } };
          return next.style.autoSize
            ? { ...next, style: { ...next.style, height: autoHeight(next) } }
            : next;
        }),
      })),
    [commit],
  );
  const rotateNode = useCallback(
    (id: string, rotation: number) => updateStyle(id, { rotation }),
    [updateStyle],
  );
  const curveNode = useCallback(
    (id: string, curveX: number, curveY: number) =>
      updateStyle(id, { curveX, curveY }),
    [updateStyle],
  );
  const updateLink = useCallback(
    (id: string, patch: Partial<MapLink>) =>
      commit((d) => ({
        ...d,
        links: d.links.map((e) =>
          e.id === id && (!e.locked || patch.locked === false)
            ? { ...e, ...patch }
            : e,
        ),
      })),
    [commit],
  );
  const updateSelectedLinks = useCallback(
    (ids: string[], patch: Partial<MapLink>) =>
      commit((d) => ({
        ...d,
        links: d.links.map((link) =>
          ids.includes(link.id) && !link.locked ? { ...link, ...patch } : link,
        ),
        nodes: d.nodes.map((node) =>
          ids.includes(`tree-${node.id}`) && !node.parentLineLocked
            ? {
                ...node,
                ...(patch.color !== undefined
                  ? { parentLineColor: patch.color }
                  : {}),
                ...(patch.width !== undefined
                  ? { parentLineWidth: patch.width }
                  : {}),
                ...(patch.strokeStyle !== undefined
                  ? { parentLineStyle: patch.strokeStyle }
                  : {}),
                ...(patch.type !== undefined
                  ? { parentLineType: patch.type }
                  : {}),
                ...(patch.animation !== undefined
                  ? { parentAnimation: patch.animation }
                  : {}),
              }
            : node,
        ),
      })),
    [commit],
  );
  const applyLineToAll = useCallback((kind: "link" | "tree", id: string) => {
    commit((d) => {
      const link = kind === "link" ? d.links.find(e => e.id === id) : undefined;
      const node = kind === "tree" ? d.nodes.find(n => n.id === id) : undefined;
      if (!link && !node) return d;
      const color = link?.color ?? node?.parentLineColor ?? "#8796bb";
      const width = link?.width ?? node?.parentLineWidth ?? 4;
      const type = link?.type ?? node?.parentLineType ?? "default";
      const strokeStyle = link?.strokeStyle ?? node?.parentLineStyle ?? "solid";
      const animation = link?.animation ?? node?.parentAnimation;
      return {
        ...d,
        links: d.links.map(e => e.locked ? e : {
          ...e, color, width, type, strokeStyle, dashed: strokeStyle === "dashed", animation,
          ...(link ? {arrow:link.arrow, markerStart:link.markerStart, markerEnd:link.markerEnd, arrowColor:link.arrowColor} : {}),
        }),
        nodes: d.nodes.map(n => !n.parentId || n.parentLineLocked ? n : {
          ...n, parentLineColor:color, parentLineWidth:width,
          parentLineType:type, parentLineStyle:strokeStyle, parentAnimation:animation,
        }),
      };
    });
  }, [commit]);
  const onMove = useCallback(
    (moves: { id: string; x: number; y: number }[]) =>
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) => {
          const move = moves.find((x) => x.id === n.id);
          if (n.locked) return n;
          if (move) return { ...n, position: { x: move.x, y: move.y } };
          const movedGroup = moves
            .map((m) => ({
              m,
              source: d.nodes.find((item) => item.id === m.id),
            }))
            .find(
              ({ source }) => source?.groupId && source.groupId === n.groupId,
            );
          return movedGroup
            ? {
                ...n,
                position: {
                  x:
                    n.position.x +
                    movedGroup.m.x -
                    movedGroup.source!.position.x,
                  y:
                    n.position.y +
                    movedGroup.m.y -
                    movedGroup.source!.position.y,
                },
              }
            : n;
        }),
      })),
    [commit],
  );
  const onResize = useCallback(
    (id: string, x: number, y: number, w: number, h: number) =>
      commit((d) => {
        const ids = selectedIdsRef.current.includes(id)
          ? selectedIdsRef.current
          : [id];
        const anchorGroup = d.nodes.find((node) => node.id === id)?.groupId;
        const selected = d.nodes.filter(
          (node) =>
            !node.locked &&
            (ids.includes(node.id) ||
              (anchorGroup && node.groupId === anchorGroup)),
        );
        const anchor = selected.find((node) => node.id === id);
        if (!anchor) return d;
        const scaleX = w / anchor.style.width;
        const scaleY = h / anchor.style.height;
        const minX = Math.min(...selected.map((node) => node.position.x));
        const minY = Math.min(...selected.map((node) => node.position.y));
        const originX = minX + (x - anchor.position.x);
        const originY = minY + (y - anchor.position.y);
        return {
          ...d,
          nodes: d.nodes.map((n) => {
            if (!selected.some((item) => item.id === n.id)) return n;
            const nextWidth = n.id === id ? w : n.style.width * scaleX;
            const nextHeight = n.id === id ? h : n.style.height * scaleY;
            const textScale = Math.sqrt(scaleX * scaleY);
            return {
              ...n,
              position: {
                x: Math.round(originX + (n.position.x - minX) * scaleX),
                y: Math.round(originY + (n.position.y - minY) * scaleY),
              },
              style: {
                ...n.style,
                width: Math.round(nextWidth),
                height: Math.round(nextHeight),
                autoSize: false,
                ...(n.textOnly ||
                (n.style.background === "#ffffff00" &&
                  n.style.borderWidth === 0)
                  ? {
                      fontSize: Math.max(
                        8,
                        Math.min(160, Math.round(n.style.fontSize * textScale)),
                      ),
                      padding: Math.round(n.style.padding * textScale),
                    }
                  : {}),
              },
            };
          }),
        };
      }),
    [commit],
  );
  const flashBranch = useCallback((id: string) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const children = descendants(docRef.current.nodes, id);
    setOpeningEdges(children);
    if (openingTimer.current) clearTimeout(openingTimer.current);
    const duration = Math.max(
      0.2,
      ...docRef.current.nodes
        .filter(
          (n) => children.includes(n.id) && n.parentAnimation?.mode !== "none",
        )
        .map((n) =>
          Math.max(0.2, Math.min(5, n.parentAnimation?.duration ?? 1)),
        ),
    );
    openingTimer.current = setTimeout(
      () => setOpeningEdges([]),
      duration * 1000,
    );
  }, []);
  useEffect(
    () => () => {
      if (openingTimer.current) clearTimeout(openingTimer.current);
    },
    [],
  );
  const onToggle = useCallback(
    (id: string) => {
      if (docRef.current.nodes.find((n) => n.id === id)?.locked) return;
      const expanding = Boolean(
        docRef.current.nodes.find((n) => n.id === id)?.collapsed,
      );
      if (expanding) flashBranch(id);
      commitRaw((d) => {
        const next = setBranch(
          d,
          id,
          !d.nodes.find((n) => n.id === id)?.collapsed,
        );
        return expanding && next.settings.direction !== "free"
          ? autoLayout(next)
          : next;
      });
    },
    [commitRaw, flashBranch],
  );
  const onEdit = useCallback(
    (id: string) => {
      if (docRef.current.settings.locked) return;
      if (docRef.current.nodes.some((n) => n.id === id && !n.locked)) {
        setEditingId(id);
        select([id], null);
      }
    },
    [select],
  );
  const onConnect = useCallback(
    (
      source: string,
      target: string,
      sourceHandle?: string,
      targetHandle?: string,
    ) => {
      if (
        docRef.current.nodes.some(
          (n) => (n.id === source || n.id === target) && n.locked,
        )
      )
        return;
      if (source === target) {
        setNotice("Connect two different nodes.");
        return;
      }
      commit((d) => {
        if (
          d.links.some(
            (e) =>
              e.source === source &&
              e.target === target &&
              e.sourceHandle === sourceHandle &&
              e.targetHandle === targetHandle,
          )
        )
          return d;
        return {
          ...d,
          links: [
            ...d.links,
            {
              id: uid(),
              source,
              target,
              sourceHandle,
              targetHandle,
              kind: "reference",
              label: "",
              labelFontSize: 12,
              color: "#8373cf",
              width: 4,
              dashed: false,
              strokeStyle: "solid",
              type: "default",
              arrow: true,
            },
          ],
        };
      });
      setMode("select");
    },
    [commit],
  );
  const perform = useCallback(
    (action: string) => {
      const current = docRef.current,
        id = menuRef.current?.nodeId ?? selectedIdsRef.current[0],
        node = current.nodes.find((n) => n.id === id);
      const pos = menuRef.current?.position;
      switch (action) {
        case "add":
          add(null, pos);
          break;
        case "child":
          if (id) add(id);
          break;
        case "sibling":
          if (node) add(node.parentId);
          break;
        case "parent":
          if (id)
            commit((d) => {
              const next = addParent(d, id);
              return next.settings.direction === "free"
                ? next
                : autoLayout(next);
            });
          break;
        case "forward":
        case "backward":
        case "front":
        case "back":
          if (id)
            commit((d) => {
              const items = [...d.nodes],
                index = items.findIndex((n) => n.id === id);
              if (index < 0) return d;
              const [item] = items.splice(index, 1);
              const target =
                action === "front"
                  ? items.length
                  : action === "back"
                    ? 0
                    : Math.max(
                        0,
                        Math.min(
                          items.length,
                          index + (action === "forward" ? 1 : -1),
                        ),
                      );
              items.splice(target, 0, item);
              return { ...d, nodes: items };
            });
          break;
        case "duplicate":
          if (id) commit((d) => duplicate(d, id, false));
          break;
        case "duplicateSubtree":
          if (id) commit((d) => duplicate(d, id, true));
          break;
        case "delete":
          if (id) {
            commit((d) => deleteNode(d, id, false));
            select([], null);
          }
          break;
        case "deleteSubtree":
          if (id) {
            commit((d) => deleteNode(d, id, true));
            select([], null);
          }
          break;
        case "deleteEdge":
          if (selectedEdge) {
            commit((d) => removeConnection(d, selectedEdge));
            select([], null);
          }
          break;
        case "collapse":
          if (id) commit((d) => setBranch(d, id, true));
          break;
        case "expand":
          if (id) {
            if (node?.collapsed) flashBranch(id);
            commit((d) => {
              const next = setBranch(d, id, false);
              return next.settings.direction === "free"
                ? next
                : autoLayout(next);
            });
          }
          break;
        case "collapseAll":
          if (id) commit((d) => setBranch(d, id, true, true));
          break;
        case "expandAll":
          if (id) {
            flashBranch(id);
            commit((d) => {
              const next = setBranch(d, id, false, true);
              return next.settings.direction === "free"
                ? next
                : autoLayout(next);
            });
          }
          break;
        case "toggle":
          if (id) onToggle(id);
          break;
        case "copy":
          if (node) setClipboardNode({ ...node, style: { ...node.style } });
          break;
        case "paste":
          void pasteDesktopImage(pos).then((pastedImage) => {
            if (pastedImage || !clipboardNode) return;
            const latest = docRef.current;
            const next = addNode(latest, null, pos, clipboardNode.title);
            const n = next.nodes.at(-1)!;
            n.text = clipboardNode.text;
            n.description = clipboardNode.description;
            n.imageSrc = clipboardNode.imageSrc;
            n.textOnly = clipboardNode.textOnly;
            n.style = { ...clipboardNode.style };
            commit(next);
            select([n.id], null);
          });
          break;
        case "copyStyle":
          if (node) setClipboardStyle({ ...node.style });
          break;
        case "pasteStyle":
          if (id && clipboardStyle) updateStyle(id, clipboardStyle);
          break;
        case "edit":
          if (id) onEdit(id);
          break;
        case "navigate":
          if (id) {
            select([id], null);
            setSearchId(id);
          }
          break;
        case "fit":
          setFitToken((v) => v + 1);
          break;
        case "layout":
          commit((d) => autoLayout(d));
          setFitToken((v) => v + 1);
          break;
        case "minimap":
          commit((d) => ({
            ...d,
            settings: { ...d.settings, minimap: !d.settings.minimap },
          }));
          break;
        default:
          if (action.startsWith("reparent:")) {
            const [, childId, value] = action.split(":");
            const parentId = value === "root" ? null : value;
            if (
              parentId !== childId &&
              (!parentId || current.nodes.some((n) => n.id === parentId)) &&
              (!parentId || !isAncestor(current.nodes, childId, parentId))
            )
              commit((d) => ({
                ...d,
                nodes: d.nodes.map((n) =>
                  n.id === childId ? { ...n, parentId } : n,
                ),
              }));
          } else if (action.startsWith("navigate:")) {
            const destination = action.slice(9);
            select([destination], null);
            setSearchId(destination);
          } else if (action.startsWith("theme:")) {
            const choice = action.slice(6);
            commit((d) => ({
              ...d,
              settings: {
                ...d.settings,
                theme: choice === "light" ? "light" : "dark",
                darkTheme:
                  choice === "light"
                    ? d.settings.darkTheme
                    : (choice as DarkTheme),
              },
            }));
          } else if (action.startsWith("direction:")) {
            const direction = action.split(":")[1] as Direction;
            commit((d) => {
              const next = { ...d, settings: { ...d.settings, direction } };
              return direction === "free" ? next : autoLayout(next);
            });
            if (direction !== "free") setFitToken((v) => v + 1);
          } else if (/^(horizontalGap|verticalGap|nodeGap):/.test(action)) {
            const [key, value] = action.split(":");
            commit((d) => {
              const next = {
                ...d,
                settings: { ...d.settings, [key]: Number(value) },
              };
              return next.settings.direction === "free"
                ? next
                : autoLayout(next);
            });
          }
      }
    },
    [
      add,
      commit,
      select,
      selectedEdge,
      clipboardNode,
      clipboardStyle,
      pasteDesktopImage,
      onToggle,
      onEdit,
      updateStyle,
      flashBranch,
    ],
  );
  const deleteSelection = useCallback(() => {
    if (docRef.current.settings.locked) return;
    const ids = new Set(selectedIdsRef.current);
    const edge = selectedEdge;
    const strokeId = selectedStroke;
    if (!ids.size && !edge && !strokeId) return;
    commit((d) => {
      let next = d;
      for (const id of ids)
        if (!next.nodes.find((n) => n.id === id)?.locked)
          next = deleteNode(next, id, false);
      next =
        edge &&
        (edge.startsWith("tree-")
          ? !next.nodes.find((n) => n.id === edge.slice(5))?.parentLineLocked
          : !next.links.find((e) => e.id === edge)?.locked)
          ? removeConnection(next, edge)
          : next;
      return strokeId
        ? {
            ...next,
            strokes: (next.strokes ?? []).filter((s) => s.id !== strokeId),
          }
        : next;
    });
    setSelectedStroke(null);
    select([], null);
  }, [commit, selectedEdge, selectedStroke, select]);
  const find = useCallback(() => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const matches = docRef.current.nodes.filter((n) =>
      `${n.title} ${n.text} ${n.description}`.toLowerCase().includes(q),
    );
    if (!matches.length) {
      setNotice("No matching nodes found.");
      return;
    }
    const current = matches.findIndex((n) => n.id === searchId);
    const target = matches[(current + 1) % matches.length];
    commit((d) => {
      const chain = new Set<string>();
      let n = d.nodes.find((x) => x.id === target.id);
      while (n?.parentId) {
        chain.add(n.parentId);
        n = d.nodes.find((x) => x.id === n!.parentId);
      }
      return {
        ...d,
        nodes: d.nodes.map((x) =>
          chain.has(x.id) ? { ...x, collapsed: false } : x,
        ),
      };
    });
    setSearchId(target.id);
    select([target.id], null);
    setNotice(`${matches.length} results · ${target.title}`);
  }, [search, searchId, commit, select]);
  const openProject = useCallback(
    (id: string) => {
      const p = projects.find((x) => x.id === id);
      if (p) {
        reset(p);
        select([], null);
        setDialog(false);
        setFitToken((v) => v + 1);
      }
    },
    [projects, reset, select],
  );
  const newProject = useCallback(
    (demo: boolean) => {
      const p = demo ? demoProject() : emptyProject();
      const next = [...projects, p];
      setProjects(next);
      saveProjects({ version: 1, activeId: p.id, projects: next });
      reset(p);
      select([], null);
      setDialog(false);
      setFitToken((v) => v + 1);
    },
    [projects, reset, select],
  );
  const newStudyProject = useCallback(
    (templateId: string) => {
      const project = createStudyProject(templateId);
      const next = [...projects, project];
      setProjects(next);
      saveProjects({ version: 1, activeId: project.id, projects: next });
      reset(project);
      select([], null);
      setDialog(false);
      setFitToken((value) => value + 1);
    },
    [projects, reset, select],
  );
  const saveCurrentStyle = useCallback(
    (name: string) => {
      const selected = docRef.current.nodes.find(
        (node) => node.id === selectedIdsRef.current[0],
      );
      if (!selected) return;
      const saved: SavedNodeStyle = {
        id: uid(),
        name: name.trim() || `Style ${savedStyles.length + 1}`,
        style: structuredClone(selected.style),
      };
      const next = [...savedStyles, saved];
      const error = saveSavedStyles(next);
      if (error) {
        setNotice(error);
        return;
      }
      setSavedStyles(next);
      setNotice(`Style “${saved.name}” saved.`);
    },
    [savedStyles],
  );
  const useSavedStyle = useCallback(
    (id: string) => {
      const saved = savedStyles.find((style) => style.id === id);
      if (!saved) return;
      commit((document) => ({
        ...document,
        settings: {
          ...document.settings,
          defaults: structuredClone(saved.style),
          savedStyleId: id,
        },
      }));
      setNotice(`New nodes will use “${saved.name}”.`);
    },
    [savedStyles, commit],
  );
  const applySavedStyle = useCallback(
    (id: string) => {
      const saved = savedStyles.find((style) => style.id === id);
      if (!saved || !selectedIdsRef.current.length) return;
      commit((document) => ({
        ...document,
        nodes: document.nodes.map((node) =>
          selectedIdsRef.current.includes(node.id) && !node.locked
            ? { ...node, style: structuredClone(saved.style) }
            : node,
        ),
      }));
    },
    [savedStyles, commit],
  );
  const deleteSavedStyle = useCallback(
    (id: string) => {
      const next = savedStyles.filter((style) => style.id !== id);
      const error = saveSavedStyles(next);
      if (error) {
        setNotice(error);
        return;
      }
      setSavedStyles(next);
      if (docRef.current.settings.savedStyleId === id)
        commit((document) => ({
          ...document,
          settings: { ...document.settings, savedStyleId: undefined },
        }));
    },
    [savedStyles, commit],
  );
  const renameProject = useCallback(
    (id: string, name: string) => {
      const next = projects.map((p) => (p.id === id ? { ...p, name } : p));
      setProjects(next);
      if (doc.id === id) reset({ ...doc, name });
      saveProjects({ version: 1, activeId: doc.id, projects: next });
    },
    [projects, doc, reset],
  );
  const duplicateProject = useCallback(
    (id: string) => {
      const p = projects.find((x) => x.id === id);
      if (!p) return;
      const copy = {
        ...structuredClone(p),
        id: uid(),
        name: `${p.name} copy`,
        updatedAt: new Date().toISOString(),
      };
      const next = [...projects, copy];
      setProjects(next);
      saveProjects({ version: 1, activeId: doc.id, projects: next });
      setNotice("Project duplicated.");
    },
    [projects, doc.id],
  );
  const deleteProject = useCallback(
    (id: string) => {
      const remaining = projects.filter((p) => p.id !== id);
      if (id === doc.id) {
        const replacement = remaining[0] ?? emptyProject();
        if (!remaining.length) remaining.push(replacement);
        reset(replacement);
        select([], null);
      }
      setProjects(remaining);
      saveProjects({
        version: 1,
        activeId: id === doc.id ? remaining[0].id : doc.id,
        projects: remaining,
      });
    },
    [projects, doc.id, reset, select],
  );
  const deletePreviousProjects = useCallback(() => {
    const current = docRef.current;
    setProjects([current]);
    saveProjects({ version: 1, activeId: current.id, projects: [current] });
  }, []);
  const importProject = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = validateDocument(JSON.parse(text));
        const imported = {
          ...parsed,
          id: uid(),
          name: `${parsed.name} (importato)`,
        };
        const next = [...projects, imported];
        setProjects(next);
        saveProjects({ version: 1, activeId: imported.id, projects: next });
        reset(imported);
        select([], null);
        setDialog(false);
        setFitToken((v) => v + 1);
        setNotice("Project imported.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Import failed.");
      }
    },
    [projects, reset, select],
  );
  const exportProject = useCallback(
    async (type: "json" | "png" | "svg" | "md") => {
      const slug =
        doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "decision-map";
      if (type === "json")
        download(
          `${slug}.json`,
          JSON.stringify(doc, null, 2),
          "application/json",
        );
      else if (type === "md")
        download(`${slug}.md`, markdown(doc), "text/markdown");
      else {
        try {
          const exportDoc =
            exportArea === "selected"
              ? {
                  ...doc,
                  nodes: doc.nodes.filter((n) => selectedIds.includes(n.id)),
                  links: doc.links.filter(
                    (e) =>
                      selectedIds.includes(e.source) &&
                      selectedIds.includes(e.target),
                  ),
                  strokes: [],
                }
              : doc;
          if (exportArea === "selected" && !exportDoc.nodes.length) {
            setNotice("Select elements to export first.");
            return;
          }
          if (exportArea === "rectangle" && !exportRect) {
            setNotice("Drag an export area on the canvas first.");
            return;
          }
          await exportGraphic(exportDoc, type, `${slug}.${type}`, {
            scale: 4,
            background: doc.settings.exportBackground,
            cropRect:
              exportArea === "rectangle"
                ? (exportRect ?? undefined)
                : undefined,
          });
        } catch {
          setNotice(`${type.toUpperCase()} export failed.`);
        }
      }
    },
    [doc, exportArea, exportRect, selectedIds],
  );
  const reorderLayer = useCallback(
    (kind: "node" | "edge", id: string, delta: number) => {
      commit((d) => {
        const key =
          kind === "node" || id.startsWith("tree-") ? "nodes" : "links";
        const list = [...d[key]];
        const at = list.findIndex(
          (item) => item.id === (id.startsWith("tree-") ? id.slice(5) : id),
        );
        const next = at + delta;
        if (at < 0 || next < 0 || next >= list.length) return d;
        [list[at], list[next]] = [list[next], list[at]];
        return { ...d, [key]: list };
      });
    },
    [commit],
  );
  const lockLayer = useCallback(
    (kind: "node" | "edge", id: string) => {
      commit((d) =>
        kind === "node"
          ? {
              ...d,
              nodes: d.nodes.map((n) =>
                n.id === id ? { ...n, locked: !n.locked } : n,
              ),
            }
          : id.startsWith("tree-")
            ? {
                ...d,
                nodes: d.nodes.map((n) =>
                  n.id === id.slice(5)
                    ? { ...n, parentLineLocked: !n.parentLineLocked }
                    : n,
                ),
              }
            : {
                ...d,
                links: d.links.map((e) =>
                  e.id === id ? { ...e, locked: !e.locked } : e,
                ),
              },
      );
    },
    [commit],
  );
  const recover = useCallback(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(RECOVERY_KEY) || "null",
      ) as MapDocument | null;
      if (!saved) {
        setNotice("No recovery copy available.");
        return;
      }
      validateDocument(saved);
      reset(saved);
      select([], null);
      setNotice("Recovery copy restored.");
    } catch {
      setNotice("Recovery copy could not be restored.");
    }
  }, [reset, select]);
  useEffect(() => {
    if (embedded) return;
    const pasteImage = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) ||
        target?.isContentEditable ||
        docRef.current.settings.locked
      )
        return;
      const imageItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.type.startsWith("image/"),
      );
      let file = imageItem?.getAsFile() ?? null;
      if (!file) {
        const text = event.clipboardData?.getData("text/plain").trim() ?? "";
        if (/^<svg[\s>]/i.test(text)) {
          file = new File([text], `clipboard-${Date.now()}.svg`, {
            type: "image/svg+xml",
          });
        }
      }
      if (!file) return;
      event.preventDefault();
      void addImage(file);
    };
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [addImage, embedded]);
  useEffect(() => {
    if (embedded) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) ||
        target?.isContentEditable
      )
        return;
      const command = e.metaKey || e.ctrlKey;
      if (docRef.current.settings.locked) {
        if (command && ["z", "d", "v"].includes(e.key.toLowerCase()))
          e.preventDefault();
        return;
      }
      if (command && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (command && e.key.toLowerCase() === "d") {
        e.preventDefault();
        perform("duplicate");
      } else if (command && e.key.toLowerCase() === "c") {
        if (selectedIdsRef.current.length) {
          e.preventDefault();
          perform("copy");
        }
      } else if (command && e.key.toLowerCase() === "v") {
        if (clipboardNode) {
          e.preventDefault();
          perform("paste");
        }
      } else if (command && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setExportDialog(true);
      } else if (!command && e.key.toLowerCase() === "n") {
        e.preventDefault();
        add();
      } else if (!command && e.key.toLowerCase() === "v") {
        setMode("select");
      } else if (!command && e.key.toLowerCase() === "c") {
        setMode("connect");
      } else if (!command && e.key.toLowerCase() === "h") {
        setMode("pan");
      } else if (!command && e.key.toLowerCase() === "d") {
        setMode("draw");
      } else if (!command && e.key.toLowerCase() === "e") {
        setMode("erase");
      } else if (!command && e.key.toLowerCase() === "r") {
        setMode("rectangle");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [perform, undo, redo, add, clipboardNode, embedded]);
  return (
    <div
      className={`studio theme-${doc.settings.theme} ${barsHidden ? "bars-hidden" : ""} ${embedded ? "studio-embedded" : ""}`}
      style={themeStyle}
    >
      {!embedded && !barsHidden && (
        <Toolbar
          doc={doc}
          mode={mode}
          setMode={setMode}
          locked={locked}
          drawColor={drawColor}
          drawWidth={drawWidth}
          setDrawColor={setDrawColor}
          setDrawWidth={setDrawWidth}
          selectedCount={selectedIds.length}
          hasSelectedEdge={Boolean(selectedEdge || selectedStroke)}
          onAdd={() => add(selectedIds[0] ?? null)}
          onText={() => {
            setMode("select");
            add(null, undefined, true);
          }}
          onArrow={addArrow}
          onLine={addLine}
          onNote={addNote}
          onImage={addImage}
          imageAssets={imageLibrary}
          onReuseImage={(id) => {
            const asset = imageLibrary.find((item) => item.id === id);
            if (asset) placeImageAsset(asset);
          }}
          onDelete={deleteSelection}
          onDuplicate={() => perform("duplicate")}
          onUndo={() => {
            if (!locked) undo();
          }}
          onRedo={() => {
            if (!locked) redo();
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onFit={() => setFitToken((v) => v + 1)}
          onLayout={() => perform("layout")}
          onDirection={(direction) => perform(`direction:${direction}`)}
          onExport={() => setExportDialog(true)}
          onProjects={() => { if (!initialDocument) setDialog(true); }}
          onToggleGrid={() => {
            const active = !docRef.current.settings.grid;
            commit((d) => ({
              ...d,
              settings: { ...d.settings, grid: active },
            }));
            setNotice(active ? "Grid shown." : "Grid hidden.");
          }}
          onToggleSnap={() => {
            const active = !docRef.current.settings.snap;
            commit((d) => ({
              ...d,
              settings: { ...d.settings, snap: active },
            }));
            setNotice(
              active
                ? "Snap to grid enabled while moving."
                : "Snap to grid disabled.",
            );
          }}
          search={search}
          setSearch={setSearch}
          onFind={find}
          workspacePanel={workspacePanel}
          onWorkspace={(tab) =>
            setWorkspacePanel(workspacePanel === tab ? null : tab)
          }
          savedAt={savedAt}
          memoryError={memoryError}
          onHide={() => {
            setBarsHidden(true);
            setWorkspacePanel(null);
          }}
        />
      )}
      <div className="editor-main">
        <div
          className={`canvas-wrap ${mode === "pan" ? "canvas-pan-mode" : ""}`}
        >
          {barsHidden && !embedded && (
            <button
              className="restore-bars"
              onClick={() => setBarsHidden(false)}
              title="Show top bars"
            >
              <ChevronDown size={16} /> Show bars
            </button>
          )}
          {(mode === "draw" || mode === "erase") && !locked && (
            <div className="freehand-options">
              <span>{mode === "draw" ? "Freehand drawing" : "Eraser"}</span>
              {mode === "draw" && (
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  title="Stroke color"
                />
              )}
              <label>
                {mode === "draw" ? "Width" : "Size"}{" "}
                <input
                  type="range"
                  min={mode === "draw" ? 1 : 8}
                  max={mode === "draw" ? 16 : 64}
                  value={mode === "draw" ? drawWidth : eraserSize}
                  onChange={(e) =>
                    mode === "draw"
                      ? setDrawWidth(Number(e.target.value))
                      : setEraserSize(Number(e.target.value))
                  }
                />
              </label>
              <b>{mode === "draw" ? drawWidth : eraserSize}px</b>
              <button onClick={() => setMode("select")}>Done</button>
            </div>
          )}
          <EditorCanvas
            doc={doc}
            openingEdges={openingEdges}
            locked={locked || embedded}
            embedded={embedded}
            drawColor={drawColor}
            drawWidth={drawWidth}
            eraserSize={eraserSize}
            onStroke={onStroke}
            onEraseStrokes={onEraseStrokes}
            onEraseElements={onEraseElements}
            onCreateRectangle={addRectangle}
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onMoveStroke={onMoveStroke}
            onResizeStroke={onResizeStroke}
            onToggleLock={toggleLock}
            selectedStroke={selectedStroke}
            onSelectStroke={onSelectStroke}
            selectedIds={selectedIds}
            selectedEdge={selectedEdge}
            selectedEdgeIds={selectedEdgeIds}
            searchId={searchId}
            newNodeId={newNodeId}
            mode={mode}
            onSelect={select}
            onMove={onMove}
            onResize={onResize}
            onToggle={onToggle}
            onEdit={onEdit}
            editingId={editingId}
            onInlineSave={saveInlineText}
            onRotate={rotateNode}
            onCurve={curveNode}
            onConnect={onConnect}
            onReconnect={(edgeId, connection) => {
              if (edgeId.startsWith("tree-")) {
                const childId = edgeId.slice(5);
                commit((d) => ({
                  ...d,
                  nodes: d.nodes.map((node) => {
                    if (
                      node.id !== childId ||
                      node.parentLineLocked ||
                      connection.source !== node.parentId ||
                      connection.target !== node.id
                    )
                      return node;
                    return {
                      ...node,
                      parentSourceHandle: connection.sourceHandle ?? undefined,
                      parentTargetHandle: connection.targetHandle ?? undefined,
                    };
                  }),
                }));
                return;
              }
              commit((d) => ({
                ...d,
                links: d.links.map((link) =>
                  link.id === edgeId && !link.locked
                    ? {
                        ...link,
                        source: connection.source,
                        target: connection.target,
                        sourceHandle: connection.sourceHandle ?? undefined,
                        targetHandle: connection.targetHandle ?? undefined,
                      }
                    : link,
                ),
              }));
            }}
            exportSelecting={exportSelecting}
            onExportRect={(rect) => {
              setExportRect(rect);
              setExportSelecting(false);
              setExportDialog(true);
            }}
            onEdgeControl={(id, point) => {
              if (id.startsWith("tree-"))
                commit((d) => ({
                  ...d,
                  nodes: d.nodes.map((n) =>
                    n.id === id.slice(5) && !n.parentLineLocked
                      ? { ...n, parentControlPoint: point }
                      : n,
                  ),
                }));
              else updateLink(id, { controlPoint: point });
            }}
            onContext={(x, y, nodeId, position, bounds) => {
              setMenu({ x, y, nodeId, position, bounds });
              if (nodeId) select([nodeId], null);
            }}
            onDeleteSelection={deleteSelection}
            fitToken={fitToken}
          />
          {!embedded && <div className="floating-controls">
            <button
              title="Toggle light or dark theme; choose a palette in canvas properties"
              onClick={() =>
                commit((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    theme: d.settings.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {doc.settings.theme === "light" ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </button>
            {!panelOpen && (
              <button
                title="Open properties"
                onClick={() => setPanelOpen(true)}
              >
                <PanelRightOpen size={17} />
              </button>
            )}
          </div>}
        </div>
        {panelOpen && !embedded && (
          <PropertiesPanel
            doc={doc}
            locked={locked}
            stroke={stroke}
            onStroke={updateStroke}
            node={selectedNode}
            link={link}
            treeChild={treeChild}
            selectionCount={selectedIds.length}
            selectedEdgeIds={selectedEdgeIds}
            onBatchLink={updateSelectedLinks}
            onApplyLineToAll={applyLineToAll}
            onBatchStyle={(patch) =>
              commit((d) => ({
                ...d,
                nodes: d.nodes.map((n) =>
                  selectedIds.includes(n.id) && !n.locked
                    ? { ...n, style: { ...n.style, ...patch } }
                    : n,
                ),
              }))
            }
            onDeleteSelection={deleteSelection}
            onNode={updateNode}
            onStyle={updateStyle}
            onLink={updateLink}
            onClose={() => setPanelOpen(false)}
            onAction={perform}
            clipboardStyle={clipboardStyle}
            hideCanvasTextInputs={pluginMode}
          />
        )}
        {workspacePanel && !embedded && (
          <WorkspacePanel
            tab={workspacePanel}
            doc={doc}
            history={history}
            selectedIds={selectedIds}
            selectedEdgeIds={selectedEdgeIds}
            savedAt={savedAt}
            memoryError={memoryError}
            onClose={() => setWorkspacePanel(null)}
            onSelect={select}
            onReorder={reorderLayer}
            onAlign={alignSelection}
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onLock={lockLayer}
            onJump={jumpTo}
            onDefaults={(patch) =>
              commit((d) => ({
                ...d,
                settings: {
                  ...d.settings,
                  defaults: { ...d.settings.defaults, ...patch },
                  savedStyleId: undefined,
                },
              }))
            }
            savedStyles={savedStyles}
            onSaveStyle={saveCurrentStyle}
            onUseStyle={useSavedStyle}
            onApplyStyle={applySavedStyle}
            onDeleteStyle={deleteSavedStyle}
            onRecover={recover}
          />
        )}
      </div>
      {menu && !embedded && (
        <ContextMenu
          {...menu}
          onAction={perform}
          onClose={() => setMenu(null)}
          hasStyle={Boolean(clipboardStyle)}
        />
      )}
      {dialog && !initialDocument && (
        <ProjectDialog
          projects={projects}
          activeId={doc.id}
          onClose={() => setDialog(false)}
          onNew={newProject}
          onTemplate={newStudyProject}
          onOpen={openProject}
          onRename={renameProject}
          onDuplicate={duplicateProject}
          onDelete={deleteProject}
          onDeletePrevious={deletePreviousProjects}
          onImport={importProject}
        />
      )}
      {exportDialog && (
        <ExportDialog
          area={exportArea}
          rect={exportRect}
          background={doc.settings.exportBackground ?? "theme"}
          onArea={setExportArea}
          onBackground={(background) =>
            commit((d) => ({
              ...d,
              settings: { ...d.settings, exportBackground: background },
            }))
          }
          onPickArea={() => {
            setExportArea("rectangle");
            setExportSelecting(true);
            setExportDialog(false);
          }}
          onExport={exportProject}
          onClose={() => setExportDialog(false)}
        />
      )}
      {(notice || memoryError) && (
        <div className="toast">{notice || memoryError}</div>
      )}
    </div>
  );
}
