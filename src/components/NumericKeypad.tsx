import { useEffect, useRef, useState } from "react";
import { useIsCoarsePointer, useIsMobileLandscape } from "../hooks/useMediaQuery";
import { playKeyClick } from "../sound";

const DISPLAY_FONT_SIZE = "2.1rem";

interface NumericKeypadProps {
  value: string;
  /** When true: show only the digital display, hide the number grid */
  displayOnly?: boolean;
  onChange?: (v: string) => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
  showHint?: boolean;
  /** Reset minimized state when this key changes */
  roundKey?: number;
  defaultMinimized?: boolean;
}

export default function NumericKeypad({
  value,
  displayOnly = false,
  onChange,
  onSubmit,
  canSubmit = false,
  showHint = false,
  roundKey,
  defaultMinimized = false,
}: NumericKeypadProps) {
  const isCoarsePointer = useIsCoarsePointer();
  const isMobileLandscape = useIsMobileLandscape();
  const [minimized, setMinimized] = useState(defaultMinimized);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeKeyTimeoutRef = useRef<number | null>(null);
  const defaultMinimizedRef = useRef(defaultMinimized);
  defaultMinimizedRef.current = defaultMinimized;

  useEffect(() => {
    setMinimized(defaultMinimizedRef.current);
  }, [roundKey]);

  useEffect(() => {
    if (defaultMinimized) setMinimized(true);
  }, [defaultMinimized]);

  useEffect(() => {
    return () => {
      if (activeKeyTimeoutRef.current !== null) {
        window.clearTimeout(activeKeyTimeoutRef.current);
      }
    };
  }, []);

  function flashKey(key: string) {
    setActiveKey(key);
    if (activeKeyTimeoutRef.current !== null) window.clearTimeout(activeKeyTimeoutRef.current);
    activeKeyTimeoutRef.current = window.setTimeout(() => {
      setActiveKey((c) => (c === key ? null : c));
      activeKeyTimeoutRef.current = null;
    }, 140);
  }

  function press(key: string) {
    if (!onChange) return;
    playKeyClick();
    flashKey(key);
    if (key === "⌫") { onChange(value.slice(0, -1)); return; }
    if (key === "±") {
      if (value.startsWith("-")) onChange(value.slice(1));
      else if (value !== "" && value !== "0") onChange("-" + value);
      return;
    }
    if (key === ".") { if (!value.includes(".")) onChange(value === "" ? "0." : `${value}.`); return; }
    onChange(value === "0" ? key : `${value}${key}`);
  }

  const display = value === "" ? "0" : value;
  const rows = [["7", "8", "9", "⌫"], ["4", "5", "6", "±"], ["1", "2", "3", "."]];
  const buttonHeightClass = isMobileLandscape ? "h-[56px]" : isCoarsePointer ? "h-[45px]" : "h-[55px] md:h-10";
  const base = `rounded flex items-center justify-center font-black select-none transition-transform active:scale-95 ${isMobileLandscape ? "text-[1.6875rem]" : "text-[1.5rem] md:text-[1.3125rem]"} ${buttonHeightClass}`;
  const digit = `${base} ${isMobileLandscape ? "text-[1.875rem]" : "text-[1.7rem] md:text-[1.5rem]"} bg-slate-800 text-slate-100 border border-slate-600/60`;
  const op = `${base} bg-slate-700/80 text-slate-100 border border-slate-500/60`;
  const pressedKeyStyle: React.CSSProperties = { background: "#67e8f9", color: "#020617", borderColor: "#67e8f9", boxShadow: "0 0 16px rgba(103,232,249,0.45)" };

  const width = isMobileLandscape ? "w-[16.25rem]" : "w-[12.5rem] md:w-[13.75rem]";

  return (
    <div
      className={`relative flex min-h-0 min-w-0 ${width} shrink-0 flex-col self-start rounded-xl p-1.5 gap-1`}
      style={{
        background: "rgba(2,6,23,0.97)",
        border: "4px solid rgba(56,189,248,0.45)",
        boxShadow: "0 0 18px rgba(56,189,248,0.12), inset 0 0 12px rgba(0,0,0,0.4)",
      }}
    >
      {/* Digital display */}
      <div
        className="relative rounded-lg px-3.5 flex shrink-0 items-center justify-end overflow-visible h-14 md:h-12"
        onClick={displayOnly ? undefined : () => setMinimized((m) => !m)}
        style={{
          fontFamily: "'DSEG7Classic', 'Courier New', monospace",
          fontWeight: 700,
          fontSize: DISPLAY_FONT_SIZE,
          lineHeight: 1,
          background: "rgba(0,8,4,0.95)",
          border: "2px solid rgba(56,189,248,0.28)",
          color: "#67e8f9",
          textShadow: "0 0 12px rgba(103,232,249,0.85), 0 0 26px rgba(56,189,248,0.4)",
          letterSpacing: "0.08em",
          cursor: displayOnly ? "default" : "pointer",
        }}
      >
        {display}

        {/* Hint hand */}
        {showHint && !displayOnly && (
          <div
            className="pointer-events-none absolute left-2 top-1/2"
            style={{ animation: "keypad-display-finger-fade 2.4s ease-in-out infinite", transform: "translateY(-25%)" }}
          >
            <svg viewBox="0 0 80 100" width={isCoarsePointer ? 60 : 90} height={isCoarsePointer ? 72 : 108} overflow="visible" style={{ filter: "drop-shadow(0 0 8px rgba(103,232,249,0.65))" }}>
              <path d="M24.76,22.64V12.4c0-3.18,2.59-5.77,5.77-5.77,1.44,0,2.82,.54,3.89,1.51,1.07,1,1.72,2.33,1.85,3.76l.87,10.08c2.12-1.88,3.39-4.59,3.39-7.48,0-5.51-4.49-10-10-10s-10,4.49-10,10c0,3.29,1.62,6.29,4.23,8.14Z" fill="#67e8f9" stroke="rgba(2,6,23,0.98)" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
              <path d="M55.98,69.53c0-.14,.03-.28,.09-.41l4.48-9.92v-18.37c0-1.81-1.08-3.48-2.76-4.26-6.75-3.13-13.8-4.84-20.95-5.08-.51-.01-.92-.41-.97-.91l-1.6-18.5c-.08-.94-.51-1.82-1.2-2.46-.7-.63-1.6-.99-2.54-.99-2.08,0-3.77,1.69-3.77,3.77V48.48h-2v-13.32c-2.61,.46-4.69,2.65-4.91,5.36-.56,6.79-.53,14.06,.08,21.62,.28,3.44,2.42,6.52,5.58,8.05l4.49,2.18c.35,.17,.56,.52,.56,.9v2.23h25.42v-5.97Z" fill="#67e8f9" stroke="rgba(2,6,23,0.98)" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" />
            </svg>
          </div>
        )}
      </div>

      {/* Number grid — hidden in displayOnly mode */}
      {!displayOnly && (
        <div
          className="flex min-h-0 flex-col gap-0.5"
          style={{
            overflow: "hidden",
            maxHeight: minimized ? "0px" : "300px",
            opacity: minimized ? 0 : 1,
            pointerEvents: minimized ? "none" : "auto",
            transition: "max-height 0.4s ease-in-out, opacity 0.3s ease-in-out",
          }}
        >
          {rows.map((row, r) => (
            <div key={r} className="grid grid-cols-4 gap-0.5">
              {row.map((btn) => (
                <button key={btn} type="button" onClick={() => press(btn)} className={/[0-9]/.test(btn) ? digit : op} style={activeKey === btn ? pressedKeyStyle : undefined}>
                  {btn === "±" ? <span className={`${isMobileLandscape ? "text-[2.25rem]" : "text-[2.4rem] md:text-[2.1rem]"} leading-none`}>±</span>
                    : btn === "⌫" ? <span className={`${isMobileLandscape ? "text-[2.475rem]" : "text-[2.8rem] md:text-[2.4rem]"} leading-none`}>⌫</span>
                    : btn === "." ? <span className={`${isMobileLandscape ? "text-[2.475rem]" : "text-[2.8rem] md:text-[2.4rem]"} leading-none`}>.</span>
                    : btn}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-0.5 mt-0.5">
            <button type="button" onClick={() => press("0")} className={`${digit} flex-[2]`} style={activeKey === "0" ? pressedKeyStyle : undefined}>0</button>
            <button type="button" onClick={onSubmit} disabled={!canSubmit} className={`${base} flex-[2] arcade-button disabled:opacity-40 disabled:cursor-not-allowed`}>
              <svg viewBox="0 0 24 24" fill="none" className={isMobileLandscape ? "w-[1.6875rem] h-[1.6875rem]" : "w-8 h-8 md:w-7 md:h-7"} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 13 L9 18 L20 7" stroke="white" strokeWidth="3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
