import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function fromHex(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}
function toHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/** Kept mounted during live updates; only Done, Escape or an outside click closes it. */
export function ColorPickerPopover({ value, x, y, ownerDocument, onChange, onClose }: {
  value: string; x: number; y: number; ownerDocument: Document;
  onChange: (color: string) => void; onClose: () => void;
}) {
  const [hsv, setHsv] = useState(() => fromHex(value));
  const [hex, setHex] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const win = ownerDocument.defaultView!;
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    };
    ownerDocument.addEventListener("pointerdown", outside, true);
    ownerDocument.addEventListener("keydown", escape, true);
    return () => {
      ownerDocument.removeEventListener("pointerdown", outside, true);
      ownerDocument.removeEventListener("keydown", escape, true);
    };
  }, [ownerDocument, onClose]);
  const update = (next: typeof hsv) => {
    setHsv(next);
    const color = toHex(next.h, next.s, next.v);
    setHex(color); onChange(color);
  };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    update({ ...hsv, s: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), v: 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) });
  };
  return createPortal(
    <div ref={ref} className="decision-map-color-picker" role="dialog" aria-label="Choose color"
      style={{ left: Math.max(8, Math.min(x + 8, win.innerWidth - 288)), top: Math.max(8, Math.min(y + 8, win.innerHeight - 330)) }}
      onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <div className="decision-map-color-picker-spectrum" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pick(event); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event); }}
        onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
        <span style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>
      <label>Hue<input aria-label="Hue" type="range" min="0" max="359" value={hsv.h} onChange={(event) => update({ ...hsv, h: Number(event.target.value) })} /></label>
      <label>Hex color<input aria-label="Hex color" value={hex} spellCheck={false} onChange={(event) => {
        setHex(event.target.value);
        if (/^#[0-9a-f]{6}$/i.test(event.target.value)) { setHsv(fromHex(event.target.value)); onChange(event.target.value); }
      }} /></label>
      <button type="button" onClick={onClose}>Done</button>
    </div>, ownerDocument.body,
  );
}
