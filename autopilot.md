# Autopilot Mode — Playbook

> This file documents the autopilot feature as step-by-step test steps.
> They read like a manual QA script but are executed programmatically by
> `useAutopilot.ts` and verified by `tests/autopilot.spec.ts`.

---

## Cheat Codes

| Code   | Action |
|--------|--------|
| `197879` | **Show Answer** — instantly fills the keypad with the correct answer and submits (one-off, does not start autopilot) |
| `198081` | **Toggle Autopilot** — activates or deactivates autopilot mode |

Type the digits consecutively on the keyboard. Non-digit keys reset the buffer.

---

## Step 1 — Activate Autopilot

1. Game is open and in `tapping` phase (waiting for canvas taps).
2. User types `198081` on the keyboard.
3. **VERIFY:** A green blinking robot icon appears in the top toolbar (after the comments icon).
4. **VERIFY:** Icon pulses in a fade-in → stay → fade-out cycle (~2 s period).
5. **VERIFY:** Tutorial hand hint is hidden (autopilot suppresses it).

---

## Step 2 — Tapping Phase (autopilot plays)

For each tap needed (`targetTaps` determined by `makeRound(level)`):

1. Wait `320–550 ms` before the first tap (human "noticing" delay).
2. Choose a random canvas position: `normX ∈ [0.15, 0.85]`, `normY ∈ [0.15, 0.80]`.
3. Move phantom hand (green) to that position on screen.
4. Wait `~90 ms` (hand travel animation).
5. Scale phantom hand down (`0.82×`) to simulate click press.
6. Call `simulateTap(normX, normY)` — creates ripple, plays sound, increments tap counter.
7. Scale hand back to normal.
8. Wait `380–700 ms` before next tap.
9. Repeat until `tapCount === targetTaps`.

**VERIFY:** Ripples appear at random screen positions.
**VERIFY:** Tap counter in question bar increments each time.
**VERIFY:** After final tap, game transitions to `answering` phase after ~500 ms.

---

## Step 3 — Answering Phase (autopilot types and submits)

1. Wait `700–1200 ms` (simulated reading/thinking time).
2. Roll `Math.random()`: if `< 0.20`, choose a **wrong answer** (`correct ± 1–3`); otherwise use `correct`.
3. Move phantom hand to the first digit button on the keypad.
4. For each digit of the chosen answer:
   a. Move phantom hand to that digit's button (`data-autopilot-key="<digit>"`).
   b. Click animation + call `setCalcValue(prev => prev + digit)`.
   c. Wait `180–340 ms` before next digit.
5. Wait an additional `220–380 ms`.
6. Move phantom hand to submit button (`data-autopilot-key="submit"`).
7. Click animation + call `submitAnswer()`.
8. Hide phantom hand.

**VERIFY:** Keypad display shows digits being typed one by one.
**VERIFY:** 20% of answers will be incorrect (wrong answer submitted, not self-corrected).
**VERIFY:** Feedback message appears ("Correct!" or "Wrong! It was X").
**VERIFY:** Wrong answers are reflected in the session report accuracy (never 100% in autopilot).

---

## Step 4 — Feedback Phase

1. Game shows feedback for `1200 ms` automatically.
2. Autopilot does nothing during this phase — the game timer handles progression.

**VERIFY:** Feedback message appears and disappears after ~1.2 s.

---

## Step 5 — Level Complete

1. After answering (all eggs collected = `eggsCollected >= EGGS_PER_ROUND`):
   - Game transitions to `levelComplete` phase.
   - `SessionReportModal` is shown.
2. Autopilot waits `1200–1800 ms`.
3. Autopilot calls `emailReport(summary, "amarsh.anand@gmail.com")`.
4. Autopilot waits `1800–2500 ms` from phase start.
5. If `level < levelCount`: calls `goNextLevel()` (proceeds to next level).
   Else: calls `restartAll()` (restarts from level 1, loops forever).

**VERIFY:** Email is sent to `amarsh.anand@gmail.com` automatically.
**VERIFY:** Modal closes automatically and next level / level 1 begins.
**VERIFY:** Accuracy shown in report is ≤ 80% (due to 20% wrong-answer rate over time).

---

## Step 6 — Continuous Loop

1. After level 2 completes, autopilot calls `restartAll()`.
2. Game resets to level 1 from scratch.
3. Autopilot continues from Step 2 indefinitely until manually cancelled.

**VERIFY:** Game plays levels 1 → 2 → 1 → 2 … without user interaction.

---

## Step 7 — Cancel Autopilot

**Option A — click robot icon:**
1. Click the green robot icon in the toolbar.
2. **VERIFY:** Icon disappears.
3. **VERIFY:** Phantom hand disappears.
4. **VERIFY:** All scheduled autopilot timers are cancelled.
5. **VERIFY:** Game remains in its current phase, ready for manual play.

**Option B — type `198081` again:**
1. Type `198081` on keyboard while autopilot is active.
2. Same verification as Option A.

---

## Timing Summary

| Action | Delay |
|--------|-------|
| Before first tap | 320–550 ms |
| Between canvas taps | 380–700 ms |
| Before typing answer | 700–1200 ms |
| Between keypad digits | 180–340 ms |
| Before submitting | 220–380 ms |
| Before auto-email | 1200–1800 ms |
| Before next level / restart | 1800–2500 ms |

All ranges are uniformly random to simulate human timing variation.

---

## Implementing Autopilot in a New Game

1. Copy these files from the template:
   - `src/hooks/useCheatCode.ts`
   - `src/hooks/useAutopilot.ts`
   - `src/components/PhantomHand.tsx`
   - `src/components/AutopilotIcon.tsx`
2. Add `@keyframes autopilot-blink` to your `index.css`.
3. Add `data-autopilot-key="<digit>"` and `data-autopilot-key="submit"` to your answer input buttons.
4. In your game screen component:
   - Create an `autopilotCallbacksRef` with these callbacks: `simulateTap`, `setCalcValue`, `submitAnswer`, `goNextLevel`, `playAgain`, `restartAll`, `sendEmail`.
   - Call `useAutopilot({ gameState, callbacksRef, canvasRef, autopilotEmail })`.
   - Call `useCheatCodes({ "198081": toggle, "197879": showAnswer })`.
   - Pass `isAutopilot`, `onCancelAutopilot`, `forceKeypadExpanded` to your layout component.
   - Render `<PhantomHand pos={phantomPos} />` outside the layout (fixed overlay).
5. In your layout component:
   - Accept and render `<AutopilotIcon onClick={onCancelAutopilot} />` when `isAutopilot` is true.
   - Pass `forceKeypadExpanded` to your keypad to override its minimized state.
6. Update `AUTOPILOT_EMAIL` constant to the desired recipient.
7. Run `tests/autopilot.spec.ts` to verify end-to-end.
