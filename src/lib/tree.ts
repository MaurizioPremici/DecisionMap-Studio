import { DEFAULT_STYLE, uid, type MapDocument, type MapNode } from "../types";
export const childrenOf = (nodes: MapNode[], id: string) =>
  nodes.filter((n) => n.parentId === id);
export function autoHeight(node: MapNode) {
  const charsPerLine = Math.max(
    8,
    Math.floor(
      (node.style.width - 2 * node.style.padding) /
        (node.style.fontSize * 0.55),
    ),
  );
  const lines = [node.title, node.text]
    .filter(Boolean)
    .flatMap((text) => text.split("\n"))
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );
  return Math.max(
    55,
    Math.ceil(
      lines * node.style.fontSize * 1.35 +
        2 * node.style.padding +
        (node.text ? 8 : 0),
    ),
  );
}
export function descendants(nodes: MapNode[], id: string): string[] {
  const result: string[] = [];
  const visit = (x: string) => {
    for (const child of childrenOf(nodes, x)) {
      result.push(child.id);
      visit(child.id);
    }
  };
  visit(id);
  return result;
}
export function isAncestor(nodes: MapNode[], candidate: string, id: string) {
  let current = nodes.find((n) => n.id === id);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (current.parentId === candidate) return true;
    if (seen.has(current.parentId)) return false;
    seen.add(current.parentId);
    current = nodes.find((n) => n.id === current!.parentId);
  }
  return false;
}
export function addNode(
  doc: MapDocument,
  parentId: string | null = null,
  position?: { x: number; y: number },
  title = "",
): MapDocument {
  const parent = doc.nodes.find((n) => n.id === parentId);
  const siblings = doc.nodes.filter((n) => n.parentId === parentId);
  const pos =
    position ??
    (parent
      ? {
          x: parent.position.x + parent.style.width + 130,
          y: parent.position.y + siblings.length * 145,
        }
      : { x: 120 + siblings.length * 70, y: 140 + siblings.length * 140 });
  const node: MapNode = {
    id: uid(),
    title,
    description: "",
    text: "",
    parentId,
    position: pos,
    style: { ...DEFAULT_STYLE },
    collapsed: false,
  };
  return {
    ...doc,
    nodes: [...doc.nodes, parent?.collapsed ? { ...node } : node].map((n) =>
      n.id === parentId ? { ...n, collapsed: false } : n,
    ),
  };
}
export function addParent(doc: MapDocument, id: string): MapDocument {
  const target = doc.nodes.find((n) => n.id === id);
  if (!target) return doc;
  const parent: MapNode = {
    id: uid(),
    title: "Nuovo genitore",
    description: "",
    text: "",
    parentId: target.parentId,
    position: { x: target.position.x - 300, y: target.position.y },
    style: { ...DEFAULT_STYLE },
    collapsed: false,
  };
  return {
    ...doc,
    nodes: [
      ...doc.nodes.map((n) =>
        n.id === id ? { ...n, parentId: parent.id } : n,
      ),
      parent,
    ],
  };
}
export function deleteNode(
  doc: MapDocument,
  id: string,
  subtree: boolean,
): MapDocument {
  const target = doc.nodes.find((n) => n.id === id);
  if (!target) return doc;
  const removed = new Set(subtree ? [id, ...descendants(doc.nodes, id)] : [id]);
  return {
    ...doc,
    nodes: doc.nodes
      .filter((n) => !removed.has(n.id))
      .map((n) =>
        n.parentId === id ? { ...n, parentId: target.parentId } : n,
      ),
    links: doc.links.filter(
      (e) => !removed.has(e.source) && !removed.has(e.target),
    ),
  };
}
export function removeConnection(doc: MapDocument, id: string): MapDocument {
  const child = doc.nodes.find((n) => n.parentId && `tree-${n.id}` === id);
  if (child)
    return {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === child.id ? { ...n, parentId: null } : n,
      ),
    };
  return { ...doc, links: doc.links.filter((e) => e.id !== id) };
}
export function duplicate(
  doc: MapDocument,
  id: string,
  subtree: boolean,
): MapDocument {
  const ids = new Set([id, ...(subtree ? descendants(doc.nodes, id) : [])]);
  const copies = doc.nodes.filter((n) => ids.has(n.id));
  const mapping = new Map(copies.map((n) => [n.id, uid()]));
  const cloned = copies.map((n) => ({
    ...n,
    id: mapping.get(n.id)!,
    title: n.id === id ? `${n.title} copia` : n.title,
    parentId:
      n.parentId && mapping.has(n.parentId)
        ? mapping.get(n.parentId)!
        : n.parentId,
    position: { x: n.position.x + 55, y: n.position.y + 70 },
    style: { ...n.style },
  }));
  const links = doc.links
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      ...e,
      id: uid(),
      source: mapping.get(e.source)!,
      target: mapping.get(e.target)!,
    }));
  return {
    ...doc,
    nodes: [...doc.nodes, ...cloned],
    links: [...doc.links, ...links],
  };
}
export function setBranch(
  doc: MapDocument,
  id: string,
  collapsed: boolean,
  all = false,
): MapDocument {
  const ids = new Set([id, ...(all ? descendants(doc.nodes, id) : [])]);
  return {
    ...doc,
    nodes: doc.nodes.map((n) => (ids.has(n.id) ? { ...n, collapsed } : n)),
  };
}
export function visibleIds(nodes: MapNode[]): Set<string> {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const visible = new Set<string>();
  for (const node of nodes) {
    let current = node;
    const seen = new Set<string>();
    let show = true;
    while (current.parentId) {
      if (seen.has(current.parentId)) {
        show = false;
        break;
      }
      seen.add(current.parentId);
      const parent = map.get(current.parentId);
      if (!parent || parent.collapsed) {
        show = false;
        break;
      }
      current = parent;
    }
    if (show) visible.add(node.id);
  }
  return visible;
}
export function validateDocument(value: unknown): MapDocument {
  if (!value || typeof value !== "object") throw Error("File JSON non valido.");
  const d = value as MapDocument;
  if (
    d.version !== 1 ||
    typeof d.id !== "string" ||
    typeof d.name !== "string" ||
    !Array.isArray(d.nodes) ||
    !Array.isArray(d.links) ||
    !d.settings ||
    !["light", "dark"].includes(d.settings.theme)
  )
    throw Error("Formato del progetto non compatibile.");
  const ids = new Set<string>();
  for (const n of d.nodes) {
    const s = n?.style;
    if (
      !n ||
      typeof n.id !== "string" ||
      !n.id ||
      ids.has(n.id) ||
      typeof n.title !== "string" ||
      typeof n.text !== "string" ||
      typeof n.description !== "string" ||
      !n.position ||
      !Number.isFinite(n.position.x) ||
      !Number.isFinite(n.position.y) ||
      !s ||
      !Number.isFinite(s.width) ||
      !Number.isFinite(s.height) ||
      s.width <
        (n.textOnly || (s.background === "#ffffff00" && s.borderWidth === 0)
          ? 60
          : 100) ||
      s.height <
        (n.textOnly || (s.background === "#ffffff00" && s.borderWidth === 0)
          ? 32
          : 55) ||
      !["rectangle", "rounded", "ellipse", "diamond", "triangle"].includes(
        s.shape,
      ) ||
      (n.imageSrc !== undefined &&
        (typeof n.imageSrc !== "string" ||
          !/^data:image\/(?:webp|png|jpeg|gif);base64,[a-z0-9+/=]+$/i.test(
            n.imageSrc,
          )))
    )
      throw Error("Nodo non valido o ID duplicato.");
    ids.add(n.id);
  }
  for (const n of d.nodes) {
    if (n.parentId !== null && !ids.has(n.parentId))
      throw Error("Collegamento gerarchico non valido.");
    if (isAncestor(d.nodes, n.id, n.id)) throw Error("Ciclo nella gerarchia.");
  }
  const edgeIds = new Set<string>();
  for (const e of d.links) {
    if (
      !e ||
      !e.id ||
      edgeIds.has(e.id) ||
      !ids.has(e.source) ||
      !ids.has(e.target) ||
      e.source === e.target
    )
      throw Error("Collegamento di riferimento non valido.");
    edgeIds.add(e.id);
  }
  if (d.strokes !== undefined) {
    if (
      !Array.isArray(d.strokes) ||
      d.strokes.some(
        (s) =>
          !s ||
          typeof s.id !== "string" ||
          !Array.isArray(s.points) ||
          !s.points.length ||
          s.points.some(
            (p) => !Number.isFinite(p.x) || !Number.isFinite(p.y),
          ) ||
          !/^#[0-9a-f]{6}$/i.test(s.color) ||
          !Number.isFinite(s.width) ||
          s.width < 1 ||
          s.width > 40,
      )
    )
      throw Error("Disegno libero non valido.");
  } else d.strokes = [];
  return d;
}
