import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  x: number;
  y: number;
  nodeId: string | null;
  onAction: (action: string) => void;
  onClose: () => void;
  hasStyle: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
}
export function ContextMenu(p: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: p.x + 8, top: p.y + 8 });
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
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const inset = 8;
    const width = menu.offsetWidth;
    const availableHeight = Math.max(120, p.bounds.bottom - p.bounds.top - inset * 2);
    const height = Math.min(menu.scrollHeight, availableHeight);
    let left = p.x + inset;
    if (left + width > p.bounds.right - inset) left = p.x - width - inset;
    left = Math.max(
      p.bounds.left + inset,
      Math.min(left, p.bounds.right - width - inset),
    );
    let top = p.y + inset;
    if (top + height > p.bounds.bottom - inset) top = p.y - height - inset;
    top = Math.max(
      p.bounds.top + inset,
      Math.min(top, p.bounds.bottom - height - inset),
    );
    setPosition({ left, top });
  }, [p.x, p.y, p.bounds]);

  return (
    <>
      <div className="context-scrim" onClick={p.onClose} />
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          left: position.left,
          top: position.top,
          maxHeight: Math.max(120, p.bounds.bottom - p.bounds.top - 16),
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
