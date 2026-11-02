interface Props {
  x: number;
  y: number;
  nodeId: string | null;
  onAction: (action: string) => void;
  onClose: () => void;
  hasStyle: boolean;
}
export function ContextMenu(p: Props) {
  const actions = p.nodeId
    ? [
        ["child", "Add child"],
        ["sibling", "Add sibling"],
        ["parent", "Add parent"],
        ["edit", "Edit text"],
        ["duplicate", "Duplicate"],
        ["front", "Bring to front"],
        ["forward", "Bring forward"],
        ["backward", "Send backward"],
        ["back", "Send to back"],
        ["copy", "Copy"],
        ["paste", "Paste"],
        ["copyStyle", "Copy style"],
        ["pasteStyle", "Paste style"],
        ["toggle", "Expand / collapse branch"],
        ["delete", "Delete node"],
        ["deleteSubtree", "Delete subtree"],
      ]
    : [
        ["add", "New node"],
        ["paste", "Paste"],
        ["fit", "Fit view"],
        ["layout", "Auto Layout"],
      ];
  return (
    <>
      <div className="context-scrim" onClick={p.onClose} />
      <div
        className="context-menu"
        style={{
          left: Math.min(p.x, window.innerWidth - 220),
          top: Math.min(p.y, window.innerHeight - 510),
        }}
      >
        {actions.map(([key, label]) => (
          <button
            key={key}
            disabled={key === "pasteStyle" && !p.hasStyle}
            onClick={() => {
              p.onAction(key);
              p.onClose();
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
