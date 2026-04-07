# Cheat Code System

**File:** `src/hooks/useCheatCode.ts`

---

## How it works

A global `keydown` listener (capture phase) accumulates digit keypresses into a
rolling buffer (max 12 characters). When the buffer ends with a registered code string,
the handler fires and the buffer resets.

Non-digit keys (except modifier keys) reset the buffer.

```ts
const BUFFER_MAX = 12;
const PASSTHROUGH_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "NumLock",
]);

export function useCheatCodes(handlers: Record<string, () => void>): void
```

`handlers` is a map from code string → callback. The hook uses a ref for `handlers`
so adding/removing codes during a render does not re-attach the listener.

The listener uses `{ capture: true }` priority, and calls `e.stopImmediatePropagation()`
when a code fires — preventing the triggering digit from reaching other listeners.

---

## Standard codes (all games must include)

| Code | Action |
|------|--------|
| `198081` | Toggle continuous autopilot on/off |
| `197879` | Submit the correct answer immediately (answering phase only) |

### `197879` implementation in RippleScreen:
```ts
"197879": () => {
  if (phase !== "answering") return;
  const correct = String(targetTapsRef.current);
  setCalcValue(correct);
  requestAnimationFrame(() => handleKeypadSubmitRef.current(correct));
}
```

### `198081` implementation in RippleScreen:
```ts
"198081": () => {
  singleQuestionDemoRef.current = false;
  if (isAutopilot && autopilotMode === "continuous") {
    deactivateAutopilot();
  } else {
    if (isAutopilot) deactivateAutopilot();
    setAutopilotMode("continuous");
    setCalcValue("");
    activateAutopilot();
  }
}
```

---

## Adding game-specific codes

Pass additional entries to `useCheatCodes`:

```ts
useCheatCodes({
  "197879": () => { /* show answer */ },
  "198081": () => { /* toggle autopilot */ },
  "111222": () => { /* game-specific shortcut */ },
});
```

Codes can be any string of digits up to 12 characters long.
Shorter codes will fire more easily (e.g. a 3-digit code fires after just 3 keystrokes).
Avoid codes that are substrings of other registered codes (earlier code fires first).
