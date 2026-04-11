# Cheat Code System

**File:** `src/hooks/useCheatCode.ts`

---

## How it works

A global `keydown` listener (capture phase) accumulates digit keypresses into a
rolling buffer (max 12 characters). The hook also exposes the same buffer
through `processCheatKey(...)` so on-screen keypad presses can trigger the exact
same codes on mobile.

Non-digit keys (except modifier keys) reset the buffer.

```ts
const BUFFER_MAX = 12;
const PASSTHROUGH_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "NumLock",
]);

interface UseCheatCodesResult {
  processCheatKey: (key: string) => boolean;
  resetCheatBuffer: () => void;
}

export function useCheatCodes(
  handlers: Record<string, () => void>,
): UseCheatCodesResult
```

`handlers` is a map from code string → callback. The hook uses a ref for `handlers`
so adding/removing codes during a render does not re-attach the listener.

The listener uses `{ capture: true }` priority, and calls `e.stopImmediatePropagation()`
when a code fires — preventing the triggering digit from reaching other listeners.

`processCheatKey(key)` returns `true` when a code matched. Keypad components must
use that return value to swallow the trigger digits instead of leaving `198081`
or `197879` visible in the calculator display.

---

## Standard codes (all games must include)

| Code | Action |
|------|--------|
| `198081` | Toggle continuous autopilot on/off |
| `197879` | Submit the correct answer immediately (answering phase only) |

### `197879` implementation in `RippleScreen`
```ts
"197879": () => {
  if (phase !== "answering") return;
  const correct = String(targetTapsRef.current);
  setCalcValue(correct);
  requestAnimationFrame(() => handleKeypadSubmitRef.current(correct));
}
```

### `198081` implementation in `RippleScreen`
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

## Required mobile integration

Future keypad-based games must wire both input paths into the same cheat buffer:

```ts
const { processCheatKey } = useCheatCodes({
  "197879": revealAndSubmitAnswer,
  "198081": toggleContinuousAutopilot,
});

function handleKeypadCheatInput(key: string): boolean {
  return processCheatKey(key);
}
```

Then the keypad must call that handler before mutating its visible value:

```ts
function press(key: string) {
  if (onKeyInput?.(key)) return;
  // normal keypad update logic continues here
}
```

This is mandatory. If a game only listens to `window.keydown`, the codes will
work on desktop keyboards but fail on iPhone/iPad where players use the on-screen
keypad.

---

## Adding game-specific codes

Pass additional entries to `useCheatCodes`:

```ts
const { processCheatKey } = useCheatCodes({
  "197879": () => { /* show answer */ },
  "198081": () => { /* toggle autopilot */ },
  "111222": () => { /* game-specific shortcut */ },
});
```

Codes can be any string of digits up to 12 characters long.
Shorter codes will fire more easily (e.g. a 3-digit code fires after just 3 keystrokes).
Avoid codes that are substrings of other registered codes (earlier code fires first).
