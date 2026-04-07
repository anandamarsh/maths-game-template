# Session Reporting

**Files:**
- `src/report/sessionLog.ts` — data collection
- `src/report/generatePdf.ts` — PDF generation
- `src/report/shareReport.ts` — download, Web Share API, email
- `src/components/SessionReportModal.tsx` — UI modal
- `api/send-report.ts` — Vercel serverless email endpoint

---

## Data types (`sessionLog.ts`)

### `RipplePosition`
```ts
export interface RipplePosition {
  x: number;   // 0-100 (% from left)
  y: number;   // 0-100 (% from top)
  color: string;
}
```

### `QuestionAttempt`
```ts
export interface QuestionAttempt {
  questionNumber: number;
  prompt: string;             // entryPrompt from round config
  level: 1 | 2;
  correctAnswer: number;
  childAnswer: number | null;
  isCorrect: boolean;
  timestamp: number;
  timeTakenMs: number;        // ms from startQuestionTimer() to logAttempt()
  gamePhase: "normal" | "monster";
  ripplePositions: RipplePosition[];
}
```

### `SessionSummary`
```ts
export interface SessionSummary {
  playerName: string;
  level: 1 | 2;
  date: string;           // ISO timestamp
  startTime: number;      // Date.now() at session start
  endTime: number;        // Date.now() at buildSummary()
  totalQuestions: number;
  correctCount: number;
  accuracy: number;       // 0-100, rounded
  normalEggs: number;
  monsterEggs: number;
  levelCompleted: boolean;
  monsterRoundCompleted: boolean;
  attempts: QuestionAttempt[];
}
```

---

## Session log API (`sessionLog.ts`)

Module-level state (not React state):
```ts
let _attempts: QuestionAttempt[] = [];
let _questionStartTime: number = Date.now();
let _sessionStartTime: number = Date.now();
let _questionCounter: number = 0;
```

```ts
export function startSession(): void
// Resets all state, records session start time.
// Call on mount, handleRestart(), and handleLevelSelect().

export function startQuestionTimer(): void
// Records the start time for the current question.
// Call at the beginning of each round (in startNewRound()).

export function logAttempt(attempt: Omit<QuestionAttempt, "questionNumber" | "timeTakenMs" | "timestamp">): void
// Appends an attempt. Increments counter. Calculates timeTakenMs automatically.
// Resets question timer for the next question.
// Do NOT call during single-question demo mode.

export function buildSummary(opts: {
  playerName: string;
  level: 1 | 2;
  normalEggs: number;
  monsterEggs: number;
  levelCompleted: boolean;
  monsterRoundCompleted: boolean;
}): SessionSummary
// Builds the final summary from accumulated attempts. Call when level completes.

export function clearSession(): void
export function getAttemptCount(): number
```

---

## PDF generation (`generatePdf.ts`)

```ts
export async function generateSessionPdf(summary: SessionSummary, t: TFunction): Promise<Blob>
```

Returns an A4 portrait PDF blob. `t` is the translation function for the active locale.

### PDF sections (top to bottom)

1. **Header banner** (28mm tall, rounded, `#f1f5f9` bg)
   - App icon (20×20mm, loaded from `/favicon.svg` → canvas → PNG, fallback `/icon-512.png`)
   - Title: `t("pdf.title")` (17pt bold)
   - Subtitle: `t("pdf.sessionReport", { n: level })` (9pt bold, centered)
   - Date (left) + `startTime – endTime` formatted (right), 7.5pt muted

2. **Game description** (9pt bold heading + 8pt objective line)
   - `t("pdf.gameDescription")`
   - `t("pdf.objectiveLabel")` (bold) + `t("pdf.objectiveText")` (muted)

3. **Score boxes** (3 equal boxes, 18mm tall)
   - Score (`correctCount / totalQuestions`): blue (`#1d4ed8`, bg `#eff6ff`)
   - Accuracy: green ≥80%, amber ≥50%, red <50%
   - Time (session duration): purple (`#a855f7`, bg `#faf5ff`)

4. **Egg row** (ellipses 2.2×3mm, correct=yellow `#facc15`, wrong=red `#ef4444`)

5. **Question cards** (one per attempt)
   - Header: colored left stripe (green/red), Q number, CORRECT/WRONG label, time taken
   - Body: ripple position diagram (left, 70×42mm) + question text & answers (right)

6. **Encouragement section** (32mm, lavender `#ede9fe`, star decorators)
   - Message based on accuracy: ≥90 → `t("pdf.encourage90")`, etc.
   - Tip line if any wrong answers

7. **Footer** — `t("pdf.footer")` + `t("pdf.footerUrl")` at page bottom

### Color palette
```ts
const COLORS = {
  headerBg: "#f1f5f9",    headerBorder: "#cbd5e1",
  correctBg: "#f0fdf4",   correctBorder: "#22c55e",  correctDark: "#16a34a",
  wrongBg: "#fff5f5",     wrongBorder: "#ef4444",
  accentPurple: "#a855f7",
  textDark: "#1e293b",    textMuted: "#64748b",
};
```

### Ripple diagram

Each question card shows a `70×42mm` diagram (`#f8fafc` bg, dot grid 8px step):
- Each ripple: outer ring (4mm radius), inner ring (6.5mm), center dot (1.5mm), colored by ripple color
- Overlap-aware coordinate labels (`(x,y)`) placed below/above/right/left of each dot
- Label at bottom: `t("pdf.rippleCount", { count })`

---

## Share / download (`shareReport.ts`)

### Constants (update per game)

```ts
const SITE_URL = "https://www.seemaths.com";
const GAME_NAME = "Ripple Touch";
const SENDER_NAME = "Ripple Touch";
const CURRICULUM_INDEX_URL = "https://www.educationstandards.nsw.edu.au/...";
const CURRICULUM_BY_LEVEL = {
  1: { stageLabel: "Early Stage 1 (Kindergarten) NSW Curriculum",
       code: "MAe-1WM", description: "Demonstrates and describes counting sequences.",
       syllabusUrl: "https://..." },
  2: { /* same for this game */ },
};
```

### Functions

```ts
export async function downloadReport(summary: SessionSummary): Promise<void>
// Generates PDF, triggers browser download.

export async function shareReport(summary: SessionSummary): Promise<boolean>
// Tries Web Share API with PDF file. Falls back to downloadReport() if unavailable.

export async function emailReport(summary: SessionSummary, email: string): Promise<void>
// Generates PDF → base64 → POST /api/send-report with full metadata + i18n strings.
// Throws on failure (caller shows error message).

export function canNativeShare(): boolean
// Returns true if navigator.canShare({ files: [pdf] }) is supported.
```

### Email payload sent to `/api/send-report`

```ts
{
  email, pdfBase64,
  playerName, correctCount, totalQuestions, accuracy,
  gameName, senderName, siteUrl,
  sessionTime, sessionDate, durationText,
  stageLabel, curriculumCode, curriculumDescription,
  curriculumUrl, curriculumIndexUrl,
  reportFileName,
  // i18n pre-translated strings:
  emailSubject, emailGreeting, emailBody, emailBodyHtml,
  emailCurriculum, emailCurriculumHtml, emailRegards,
}
```

---

## Email API (`api/send-report.ts`)

**Endpoint:** `POST /api/send-report`
**Body size limit:** 10MB (for base64 PDF)

**Required env vars:**
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender address

**Validation:**
- Email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `pdfBase64` must be non-empty

**Behavior:**
- If `emailBody`/`emailCurriculum`/etc. are provided (pre-translated by frontend), uses
  those strings.
- If localized HTML variants are provided, preserves inline `<strong>` and `<a>` formatting
  while keeping the locale-specific sentence structure.
- Falls back to English template strings if not provided.
- Sends via Resend API with PDF as attachment.
- Returns `{ ok: true }` on success, error object on failure.
- The local Vite `/api/send-report` route and deployed `api/send-report.ts` handler must
  remain behaviorally identical.

---

## `SessionReportModal` component

**File:** `src/components/SessionReportModal.tsx`

```tsx
interface SessionReportModalProps {
  summary: SessionSummary;
  level: number;
  onClose: () => void;                          // "Play Again"
  onNextLevel?: () => void;                     // undefined on final level
  autopilotControlsRef?: React.MutableRefObject<ModalAutopilotControls | null>;
}
```

### `ModalAutopilotControls` interface

The modal exposes this interface via `autopilotControlsRef` for autopilot to drive it:

```ts
interface ModalAutopilotControls {
  appendChar: (ch: string) => void;   // append one character to email input
  setEmail: (v: string) => void;      // set the entire email input value
  triggerSend: () => void;            // click the send button programmatically
}
```

The modal calls `autopilotControlsRef.current = { appendChar, setEmail, triggerSend }` on mount
and clears it on unmount.

### Data-autopilot-key attributes required in the modal

```tsx
<input data-autopilot-key="email-input" ... />
<button data-autopilot-key="email-send" ... />
{onNextLevel && <button data-autopilot-key="next-level" ... />}
```

### Modal content

Displayed stats:
- Level complete heading: `t("report.levelComplete")`
- Score: `t("report.score")` → `correctCount / totalQuestions`
- Accuracy: `t("report.accuracy")` → `accuracy%`
- Eggs collected: `t("report.eggs")` → `normalEggs` egg emojis

Actions:
1. **Share Report button** — calls `shareReport()`, shows loading state
2. **Email input** + **Send button** — calls `emailReport()`, shows success/error
3. **Next Level** (if `onNextLevel` defined) — `data-autopilot-key="next-level"`
4. **Play Again** — calls `onClose()` to restart current level
