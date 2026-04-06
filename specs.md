# Interactive Maths — Game Template Specs

Feature specifications for the game template. Each section describes a reusable
capability that all games built on this template should implement.

---

## Feature: Autopilot Mode

**File:** `autopilot.md` (detailed step-by-step playbook)
**Implementation:** `src/hooks/useAutopilot.ts`, `src/hooks/useCheatCode.ts`
**Components:** `PhantomHand`, `AutopilotIcon`
**Tests:** `tests/autopilot.spec.ts`

### What it does
Autopilot mode causes the game to play itself autonomously, simulating human-paced
input. Useful for demos, testing the full game loop end-to-end, and sending sample
reports without manual interaction.

### Activation
- Cheat code `198081` typed on keyboard toggles autopilot on/off.
- Cheat code `197879` shows the correct answer instantly (one-off, not autopilot).

### Behaviour
- **Tapping phase:** Simulates finger taps at random canvas positions with
  human-paced delays (380–700 ms between taps).
- **Answering phase:** Types the answer digit-by-digit on the keypad (180–340 ms
  per digit). 20% chance of submitting a wrong answer (genuine miss — counted in
  accuracy, never self-corrected).
- **Level complete:** Auto-sends a PDF report by email, then proceeds to the next
  level or restarts from level 1 to loop indefinitely.

### Visual feedback
- A green blinking robot icon appears in the toolbar while autopilot is active
  (click to cancel).
- A phantom green hand cursor shows every tap and keypad press in real time.
- Tutorial hint is hidden while autopilot is active.

### Accuracy contract
Games running in autopilot mode will **never achieve 100% accuracy** due to the
deliberate 20% wrong-answer rate. This is by design.

### Integration requirements for new games
See `autopilot.md` → "Implementing Autopilot in a New Game" section.

---

## Feature: Cheat Code System

**File:** `src/hooks/useCheatCode.ts`

A global keyboard listener that accumulates digit keypresses into a rolling buffer.
When the buffer ends with a registered code, the associated handler fires.
Non-digit, non-modifier keys reset the buffer.

### Standard codes (all games)
| Code | Action |
|------|--------|
| `198081` | Toggle autopilot |
| `197879` | Show correct answer (answering phase only) |

Additional game-specific codes may be registered via the same hook.

---

## Feature: Session Reporting

**Files:** `src/report/shareReport.ts`, `src/report/generatePdf.ts`, `src/report/sessionLog.ts`

Each level completion generates a session summary with:
- Player name, level, score, accuracy
- Per-question details (prompt, correct answer, given answer, ripple positions)
- PDF report (downloadable or emailable)
- Email via `/api/send-report` endpoint

---

## Feature: Numeric Keypad

**File:** `src/components/NumericKeypad.tsx`

DSEG7-styled display with 12-button grid. Supports minimised/expanded state.
All buttons carry `data-autopilot-key="<value>"` attributes for programmatic
interaction by the autopilot engine (add to any new game's answer input).

---

## Feature: Sound System

**File:** `src/sound/index.ts`

Web Audio API — oscillator-based SFX and background music. No external audio
files required. Music starts muted in development (`import.meta.env.DEV`).
