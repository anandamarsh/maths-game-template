# Game Loop

**File:** `src/screens/RippleScreen.tsx`

This is the main game screen. It owns all game state and coordinates every subsystem.
When building a new game, copy and adapt this file — keep all the template machinery
and only swap the game-specific canvas and logic.

---

## Game phases

```ts
type GamePhase = "tapping" | "answering" | "feedback" | "levelComplete";
```

| Phase | What the player sees | What the system does |
|-------|---------------------|---------------------|
| `tapping` | Canvas area, tutorial hint | Counts taps; transitions to `answering` when `tapCount >= targetTaps` |
| `answering` | Question prompt + keypad | Waits for keypad submit |
| `feedback` | Correct/wrong message | Plays SFX, shakes question box on wrong; transitions after 1200ms |
| `levelComplete` | Session report modal | Awaits email send + next-level click |

Phase transitions:
```
tapping → answering  (after 500ms delay once targetTaps reached)
answering → feedback (immediately on submit)
feedback → tapping   (after 1200ms — starts next round)
feedback → levelComplete (after 1200ms — if eggsCollected >= EGGS_PER_ROUND)
levelComplete → tapping  (after player clicks Next Level or Play Again)
```

---

## State variables

```ts
const [ripples, setRipples] = useState<Ripple[]>([]);
const [calcValue, setCalcValue] = useState("");        // keypad display
const [muted, setMuted] = useState(isMuted());
const [showTutorial, setShowTutorial] = useState(true);
const [level, setLevel] = useState<1 | 2>(1);
const [unlockedLevel, setUnlockedLevel] = useState(1);
const [phase, setPhase] = useState<GamePhase>("tapping");
const [tapCount, setTapCount] = useState(0);
const [targetTaps, setTargetTaps] = useState(0);
const [autopilotMode, setAutopilotMode] = useState<"continuous" | "single-question">("continuous");
const [demoRetryPending, setDemoRetryPending] = useState(false);
const [eggsCollected, setEggsCollected] = useState(0);
const [questionShake, setQuestionShake] = useState(false);
const [feedbackMsg, setFeedbackMsg] = useState("");
const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
```

Key refs (avoid stale closures):
```ts
const roundRipplesRef = useRef<RipplePosition[]>([]);  // ripple positions for current round
const targetTapsRef = useRef(targetTaps);               // always-current targetTaps
targetTapsRef.current = targetTaps;
const handleKeypadSubmitRef = useRef(handleKeypadSubmit);
handleKeypadSubmitRef.current = handleKeypadSubmit;
const autopilotCallbacksRef = useRef<AutopilotCallbacks | null>(null);
const modalControlsRef = useRef<ModalAutopilotControls | null>(null);
const canvasRef = useRef<HTMLDivElement>(null);
const musicStartedRef = useRef(false);
const roundRef = useRef(makeRound(1));
const rippleIdRef = useRef(0);
```

---

## Ripple type

```ts
interface Ripple {
  id: number;
  x: number;  // % from left (0–100)
  y: number;  // % from top (0–100)
  color: string;
}
```

---

## Core functions

### `startNewRound(lv: 1 | 2)`
```ts
function startNewRound(lv: 1 | 2) {
  const round = makeRound(lv);
  roundRef.current = round;
  setTargetTaps(round.target);
  setTapCount(0);
  setCalcValue("");
  setRipples([]);
  setPhase("tapping");
  roundRipplesRef.current = [];
  startQuestionTimer();  // from sessionLog
}
```

### `handleRestart()`
Resets everything to level 1, re-starts session, shuffles music.

### `handleLevelSelect(lv: number)`
Jumps to a specific level (only levels ≤ unlockedLevel are selectable).

### `doTap(normX, normY)` — the core tap handler
Called by both real pointer events and autopilot simulations.
```ts
const doTap = useCallback((normX: number, normY: number) => {
  if (demoRetryPending) return;
  if (phase !== "tapping") return;

  ensureMusic();           // starts music on first interaction
  setShowTutorial(false);

  const color = getRainbowColor(tapCount);     // 8-color rainbow palette
  playRipple(ripplePitch(normX, normY));       // position-mapped pitch

  // Record position for the PDF diagram
  roundRipplesRef.current.push({ x: Math.round(normX * 100), y: Math.round(normY * 100), color });

  // Add visual ripple, auto-remove after RIPPLE_DURATION_MS + 100
  const id = ++rippleIdRef.current;
  setRipples(prev => [...prev, { id, x: normX * 100, y: normY * 100, color }]);
  setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), RIPPLE_DURATION_MS + 100);

  const newCount = tapCount + 1;
  setTapCount(newCount);

  // Advance egg (progress dot) — capped at EGGS_PER_ROUND
  if (!singleQuestionDemoRef.current && !demoRecoveryPendingRef.current) {
    setEggsCollected(eggs => {
      const newEggs = Math.min(eggs + 1, EGGS_PER_ROUND);
      if (eggs < EGGS_PER_ROUND) playLevelComplete();
      return newEggs;
    });
  }

  // Transition to answering phase after 500ms
  if (newCount >= targetTaps) {
    setTimeout(() => { setPhase("answering"); setCalcValue(""); }, 500);
  }
}, [demoRetryPending, phase, tapCount, targetTaps]);
```

### `handleCanvasTap(e: React.PointerEvent)`
Converts pointer coordinates to normalized (0–1) and calls `doTap`.

### `handleKeypadSubmit(overrideValue?: string)`
```ts
const handleKeypadSubmit = useCallback((overrideValue?: string) => {
  if (demoRetryPending) return;
  if (phase !== "answering") return;
  const raw = overrideValue ?? calcValue;
  const answer = parseInt(raw, 10);
  if (isNaN(answer)) return;

  const correct = targetTaps;
  const isCorrect = answer === correct;

  // Log to session (unless in single-question demo)
  if (!singleQuestionDemoRef.current) {
    logAttempt({ prompt: roundRef.current.entryPrompt, level, correctAnswer: correct,
                 childAnswer: answer, isCorrect, gamePhase: "normal",
                 ripplePositions: [...roundRipplesRef.current] });
  }

  // Show feedback
  if (isCorrect) { playCorrect(); setFeedbackMsg(t("game.correct")); }
  else {
    playWrong();
    setQuestionShake(true);
    setTimeout(() => setQuestionShake(false), 400);
    setFeedbackMsg(t("game.wrongAnswer", { answer: correct }));
  }
  setPhase("feedback");

  // After 1200ms: decide next step
  setTimeout(() => {
    setFeedbackMsg("");
    if (singleQuestionDemoRef.current) {
      // ... demo mode recovery logic
    } else if (eggsCollected >= EGGS_PER_ROUND) {
      // Level complete
      playLevelComplete();
      setUnlockedLevel(u => Math.min(u + 1, LEVEL_COUNT));
      const summary = buildSummary({ playerName: "Explorer", level,
        normalEggs: EGGS_PER_ROUND, monsterEggs: 0,
        levelCompleted: true, monsterRoundCompleted: false });
      setSessionSummary(summary);
      setPhase("levelComplete");
    } else {
      startNewRound(level);
    }
  }, 1200);
}, [...]);
```

---

## Physical keyboard support

`useEffect` listens on `window.addEventListener("keydown")`:
- Digits 0–9: append to `calcValue` (replaces leading `"0"`)
- `Backspace`: truncate `calcValue`
- `Enter`: call `handleKeypadSubmit()` (only in `answering` phase)
- `.`: append decimal (only once)
- `-`: toggle negation

Ignored when target is `INPUT` or `TEXTAREA`.

---

## Question text logic

```ts
let questionText: string;
if (phase === "tapping")     questionText = t("game.tapScreen", { count: tapCount, total: targetTaps });
if (phase === "answering")   questionText = roundRef.current.entryPrompt;
if (phase === "feedback")    questionText = feedbackMsg;
if (phase === "levelComplete") questionText = t("game.levelComplete");
```

---

## Canvas rendering

The canvas `<div>` uses `position: absolute; inset: 0; cursor: crosshair`.
`style={{ touchAction: "none" }}` prevents browser scroll during play.

Background layers (bottom to top):
1. Deep-space radial gradient: `radial-gradient(ellipse at top, #1e3a5f 0%, #080e1c 72%)`
2. `.arcade-grid` overlay at 20% opacity (pointer-events: none)
3. SVG star field — hardcoded array of 31 `[x%, y%]` positions, circles r=1 or r=1.5

Ripple rendering: each `Ripple` renders 3 concentric expanding rings + 1 center dot.
```tsx
{[0, 1, 2].map((ring) => (
  <div style={{
    width: `${60 + ring * 40}px`,   // 60px, 100px, 140px
    height: `${60 + ring * 40}px`,
    border: `${3 - ring}px solid ${r.color}`,  // 3px, 2px, 1px
    animation: `ripple-expand ${RIPPLE_DURATION_MS}ms ease-out ${ring * 80}ms forwards`,
  }} />
))}
// Center dot:
<div style={{
  width: "12px", height: "12px",
  background: r.color,
  boxShadow: `0 0 12px ${r.color}`,
  animation: `ripple-expand ${RIPPLE_DURATION_MS * 0.4}ms ease-out forwards`,
}} />
```

---

## Single-question demo mode

When the robot button is clicked without autopilot active, it triggers a
**single-question demo**: autopilot plays one tap+answer sequence, then
the game pauses and shows a "Try It Yourself" button (`demoRetryPending = true`).

The button renders as a fixed overlay (`z-[85]`) above everything:
```tsx
{demoRetryPending && (
  <div className="fixed inset-0 z-[85]">
    <div className="absolute inset-0 pointer-events-auto" />
    <div className="absolute left-1/2 top-6 -translate-x-1/2">
      <button onClick={handleDemoTryAgain} className="arcade-button inline-flex px-8 py-4 text-base md:text-lg"
        style={{ borderColor: "#fbbf24" }}>
        {t("game.tryOnYourOwn")}
      </button>
    </div>
  </div>
)}
```

`handleDemoTryAgain()` resets `demoRetryPending` and starts a new round.

---

## Prevent scroll on touch

```ts
useEffect(() => {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener("touchmove", prevent, { passive: false });
  return () => document.removeEventListener("touchmove", prevent);
}, []);
```

---

## Scene capture (dev only)

Shown only when `IS_LOCALHOST_DEV` is active.

- the existing camera button captures the full scene via `html2canvas` at 2× scale
- a second dotted-square camera button toggles a square snip overlay
- the snip selector starts centred, can be dragged, and can be resized while
  staying square
- a floating camera button on the selector captures exactly that square crop
- capture plays a shutter-style click, flashes briefly, and closes the snip tool

---

## JSX structure

```tsx
return (
  <>
    <GameLayout {...props}>
      {/* Game canvas div with ref={canvasRef} */}
      {/* SessionReportModal (when sessionSummary != null) */}
    </GameLayout>

    {/* Demo retry button (fixed overlay, z-85) */}

    {/* PhantomHand (fixed overlay, outside GameLayout) */}
    <PhantomHand pos={phantomPos} />
  </>
);
```

`PhantomHand` must be **outside** `GameLayout` so it renders above all z-index layers.

---

## Autopilot wiring (in the screen)

```ts
autopilotCallbacksRef.current = {
  simulateTap: doTap,
  setCalcValue,
  submitAnswer: (ov) => handleKeypadSubmitRef.current(ov),
  goNextLevel: handleNextLevel,
  playAgain: handleReportClose,
  restartAll: handleRestart,
  emailModalControls: modalControlsRef,
  onAutopilotComplete: deactivateAutopilot,
};
```

This ref must be updated **every render** (after `deactivateAutopilot` is stable).
See `specs/autopilot.md` for the full autopilot system.
