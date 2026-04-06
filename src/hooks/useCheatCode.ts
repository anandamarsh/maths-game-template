import { useEffect, useRef } from "react";

const BUFFER_MAX = 12;
const PASSTHROUGH_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "NumLock",
]);

/**
 * Listens for sequences of digit keypresses globally.
 * When the accumulated buffer ends with a registered code, fires its handler.
 * Non-digit, non-modifier keys reset the buffer.
 * Uses capture phase so it fires before phase-specific game listeners.
 */
export function useCheatCodes(handlers: Record<string, () => void>): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const bufferRef = useRef("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        bufferRef.current = (bufferRef.current + e.key).slice(-BUFFER_MAX);
        for (const code of Object.keys(handlersRef.current)) {
          if (bufferRef.current.endsWith(code)) {
            bufferRef.current = "";
            handlersRef.current[code]();
            return;
          }
        }
      } else if (!PASSTHROUGH_KEYS.has(e.key)) {
        bufferRef.current = "";
      }
    }
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);
}
