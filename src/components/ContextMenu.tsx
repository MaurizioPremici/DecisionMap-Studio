import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const availableHeight = Math.max(120, viewportHeight - inset * 2);
    const height = Math.min(menu.scrollHeight, availableHeight);
    let left = p.x + inset;
    if (left + width > viewportWidth - inset) left = p.x - width - inset;
    left = Math.max(inset, Math.min(left, viewportWidth - width - inset));
    let top = p.y + inset;
    if (top + height > viewportHeight - inset) top = p.y - height - inset;
    top = Math.max(inset, Math.min(top, viewportHeight - height - inset));
    setPosition({ left, top });
  }, [p.x, p.y]);

  return createPortal(
    <>
      <div
        className="decision-map-context-scrim"
        onClick={p.onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          p.onClose();
        }}
      />
      <div
        ref={menuRef}
        className="decision-map-context-menu"
        role="menu"
        style={{
          "--decision-map-context-x": `${position.left}px`,
          "--decision-map-context-y": `${position.top}px`,
          "--decision-map-context-max-height": `${Math.max(120, (window.visualViewport?.height ?? window.innerHeight) - 16)}px`,
        } as CSSProperties}
        onContextMenu={(event) => event.preventDefault()}
      >
        {actions.map(([key, label]) => (
          <button
            type="button"
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
    </>,
    document.body,
  );
}
