# Autopilot Mode

**Files:**
- `src/hooks/useAutopilot.ts` — engine
- `src/components/PhantomHand.tsx` — visual cursor overlay
- `src/components/AutopilotIcon.tsx` — blinking robot icon in toolbar

---

## What it does

Plays the game autonomously — tapping the canvas, entering answers, sending the email
report, and proceeding to the next level — in a loop. Simulates human-like timing with
randomised delays. Continuous autopilot may deliberately miss answers; the
single-question robot demo should always show the correct answer.

Two modes:
- **`"continuous"`** — plays indefinitely, loops back after final level
- **`"single-question"`** — plays one tap+answer cycle, then stops

---

## Activation

- Cheat code `198081` (hardware keyboard or on-screen keypad digits) → toggles continuous autopilot
- Cheat code `197879` → shows and submits the correct answer once (not full autopilot)
- Robot button click when autopilot inactive → starts `"single-question"` mode
- Robot button click when autopilot active → stops autopilot

---

## Timing constants (`T`)

All delays are `[lo, hi]` ranges in milliseconds, randomised with `rand([lo, hi])`:

```ts
const T = {
  TAP_FIRST:   [640, 1100],   // before first canvas tap
  TAP_BETWEEN: [760, 1400],   // between subsequent canvas taps
  READ_DELAY:  [1400, 2400],  // "reading" the question before typing
  KEY_BETWEEN: [360, 680],    // between keypad digit presses
  PRE_SUBMIT:  [440, 760],    // pause before pressing submit
  EMAIL_CLICK: [2000, 3200],  // after modal appears, before starting to type email
  EMAIL_CHAR:  [8, 15],       // between each email character
  SEND_PAUSE:  [700, 1100],   // after last email char, before clicking send
  END_PAUSE:   [3600, 5000],  // after send, before clicking Next Level
};
```

**`rand([lo, hi])`:**
```ts
function rand([lo, hi]: [number, number]): number {
  return Math.round(lo + Math.random() * (hi - lo));
}
```

---

## Wrong answer generation

```ts
const WRONG_ANSWER_RATE = 0.2;  // 20% chance

function wrongAnswer(correct: number): number {
  // Pick ±1 to ±3 from correct, filtered to be > 0 and ≤ 20
  const candidates = [-3,-2,-1,1,2,3]
    .map(d => correct + d)
    .filter(v => v > 0 && v <= 20);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? correct + 1;
}
```

Wrong answers are **genuine misses** — they are logged in the session, counted in
accuracy, and never self-corrected. This ensures continuous autopilot never achieves 100%.

Important:
- Wrong-answer injection applies only to `"continuous"` mode.
- `"single-question"` mode must always answer correctly because it is the child-facing
  "show me how" action.

---

## Interfaces

### `AutopilotCallbacks`

Must be populated by the screen every render (via `autopilotCallbacksRef.current = {...}`):

```ts
export interface AutopilotCallbacks {
  simulateTap: (normX: number, normY: number) => void;
  setCalcValue: React.Dispatch<React.SetStateAction<string>>;
  submitAnswer: (overrideValue?: string) => void;
  goNextLevel: () => void;
  playAgain: () => void;
  restartAll: () => void;
  emailModalControls: React.MutableRefObject<ModalAutopilotControls | null>;
  onAutopilotComplete?: () => void;
}
```

### `ModalAutopilotControls`

Exposed by `SessionReportModal` via `autopilotControlsRef`:

```ts
export interface ModalAutopilotControls {
  appendChar: (ch: string) => void;
  setEmail: (v: string) => void;
  triggerSend: () => void;
}
```

### `PhantomPos`

```ts
export interface PhantomPos {
  x: number;        // screen pixel X
  y: number;        // screen pixel Y
  isClicking: boolean;
}
```

### `AutopilotGameState`

```ts
interface AutopilotGameState {
  phase: AutopilotGamePhase;  // "tapping" | "answering" | "feedback" | "levelComplete"
  targetTaps: number;
  tapCount: number;
  level: number;
  levelCount: number;
}
```

### `UseAutopilotArgs`

```ts
interface UseAutopilotArgs {
  gameState: AutopilotGameState;
  callbacksRef: React.RefObject<AutopilotCallbacks | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  autopilotEmail: string;
  mode?: "continuous" | "single-question";  // default "continuous"
}
```

---

## Hook API

```ts
export function useAutopilot(args: UseAutopilotArgs): {
  isActive: boolean;
  activate: () => void;
  deactivate: () => void;
  phantomPos: PhantomPos | null;
}
```

The hook:
- Maintains `isActive` state + `isActiveRef` (so callbacks can check without closure issues)
- Maintains `timersRef` (all scheduled `setTimeout` IDs, cleared on deactivate)
- Watches `[isActive, gameState.phase]` — re-schedules actions on every phase change

---

## Phase scheduling

### `scheduleTaps(targetCount, alreadyDone)`

```ts
let delay = rand(T.TAP_FIRST);
for (let i = 0; i < remaining; i++) {
  after(delay, () => {
    const normX = 0.15 + Math.random() * 0.7;   // avoid edges
    const normY = 0.15 + Math.random() * 0.65;
    // 1. Move hand to screen position
    moveHand(screenX, screenY);
    // 2. 100ms later: click + simulateTap
    setTimeout(() => { clickAt(screenX, screenY); callbacks.simulateTap(normX, normY); }, 100);
  });
  delay += rand(T.TAP_BETWEEN);
}
```

### `scheduleAnswer(correctAnswer)`

```ts
// Decide wrong or correct
const answer = Math.random() < WRONG_ANSWER_RATE ? wrongAnswer(correct) : correct;
const digits = String(answer).split("");
let delay = rand(T.READ_DELAY);

// Move hand toward first key before starting to type
after(delay - 200, () => { /* moveHand to first digit key */ });

// Click each digit button
for (const d of digits) {
  after(delay, () => {
    const el = document.querySelector(`[data-autopilot-key="${d}"]`);
    clickAt(...);
    el.click();  // fires press() → playKeyClick() + onChange()
  });
  delay += rand(T.KEY_BETWEEN);
}

// Click submit
after(delay + rand(T.PRE_SUBMIT), () => {
  clickAt(submitRect...);
  setTimeout(() => {
    callbacks.submitAnswer();
    setPhantomPos(null);
    if (mode === "single-question") {
      // deactivate + call onAutopilotComplete
    }
  }, 140);
});
```

### `scheduleLevelEnd()`

Sequence:
1. `rand(T.EMAIL_CLICK)` → move hand + click email input → `setEmail("")`
2. `+ 300ms` → type email char-by-char (`rand(T.EMAIL_CHAR)` between each)
3. `+ rand(T.SEND_PAUSE)` → move hand to send button
4. Click send → `triggerSend()`
5. `+ rand(T.END_PAUSE)` → move to "Next Level" button (if `level < levelCount`)
6. Click "Next Level" → `el.click()` or `goNextLevel()` fallback
7. If final level → deactivate + `onAutopilotComplete()`

---

## Helper functions

```ts
function canvasToScreen(normX, normY): { x, y } | null
// Converts normalized (0-1) canvas coordinates to screen pixels using canvasRef.

function getKeyRect(key: string): DOMRect | null
// Finds an element by data-autopilot-key and returns its bounding rect.

function moveHand(x, y)
// Sets phantomPos without isClicking (hand hovers).

function clickAt(x, y)
// Sets phantomPos with isClicking=true, auto-reverts after 130ms.

function after(ms, fn)
// Schedules fn after ms, cancels if isActive becomes false.
// Pushes timer ID to timersRef.
```

---

## `PhantomHand` component

```tsx
// src/components/PhantomHand.tsx
interface PhantomHandProps {
  pos: PhantomPos | null;
}
```

When `pos` is null, renders nothing.

When visible:
- Fixed position at `(pos.x - 12, pos.y - 8)` (offset so fingertip is at click point)
- z-index: 200, pointer-events: none
- Green hand emoji `🖐` or SVG hand icon
- Drop shadow: `0 0 12px rgba(0, 255, 100, 0.7)`
- `isClicking`: scale down to 0.85 with `transition: transform 100ms`

---

## `AutopilotIcon` component

```tsx
// src/components/AutopilotIcon.tsx
interface AutopilotIconProps {
  onClick: () => void;
  active: boolean;      // whether autopilot/demo is running
  title: string;
  ariaLabel: string;
}
```

Renders a robot emoji `🤖` in a circular button.

When `active`:
- `animation: autopilot-blink 2s ease-in-out infinite`
- Cyan glow (from the `autopilot-blink` keyframe defined in `index.css`)

When inactive (robot button = "show me how to solve this"):
- No animation, normal `.arcade-button` style

---

## Integration checklist for new games

1. Call `useAutopilot` in your screen with `gameState`, `callbacksRef`, `canvasRef`, `autopilotEmail`.
2. Populate `autopilotCallbacksRef.current` every render with all 8 callbacks.
3. Pass `autopilotControlsRef` to `SessionReportModal` when `isAutopilot` is true.
4. Render `<PhantomHand pos={phantomPos} />` **outside** `GameLayout` (above z-index 200).
5. Pass `isQuestionDemo={isRobotVisibleActive}` and `onQuestionDemo={handleRobotButtonClick}` to `GameLayout`.
6. Pass `forceKeypadExpanded={isAutopilot && phase === "answering"}` to `GameLayout`.
7. All interactive elements the autopilot needs to click must have `data-autopilot-key` attributes.
