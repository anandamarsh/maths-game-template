# Game Layout Component

**File:** `src/components/GameLayout.tsx`

Master layout wrapper. Every game screen renders its canvas as `children` inside
`GameLayout`, which provides the full toolbar, keypad, question box, social drawers,
and progress indicators.

---

## Props interface

```ts
interface GameLayoutProps {
  // Audio
  muted: boolean;
  onToggleMute: () => void;

  // Toolbar
  onRestart?: () => void;        // if omitted, restart button is hidden
  onCapture?: () => void;        // if provided, shows dev-only camera icon button

  // Keypad — fully controlled from parent
  keypadValue: string;
  onKeypadChange?: (v: string) => void;
  onKeypadSubmit?: () => void;
  canSubmit?: boolean;           // default false

  // Question bar
  question?: ReactNode;          // displayed in QuestionBox
  questionShake?: boolean;       // triggers shake animation

  // Progress dots
  progress?: number;             // filled dots
  progressTotal?: number;        // total dots

  // Level buttons
  levelCount?: number;
  currentLevel?: number;
  unlockedLevel?: number;
  onLevelSelect?: (level: number) => void;

  // Autopilot
  isAutopilot?: boolean;
  onCancelAutopilot?: () => void;
  isQuestionDemo?: boolean;      // controls robot icon active state
  onQuestionDemo?: () => void;   // if omitted, robot icon hidden

  // Force keypad expanded (autopilot typing)
  forceKeypadExpanded?: boolean;

  // Game canvas
  children: ReactNode;
}
```

---

## Layout structure (HTML/CSS)

Outermost div: `fixed inset-0 overflow-hidden flex flex-col arcade-grid`
with `style={{ background: "#020617" }}`.

### Layer 1: Social drawers (conditionally shown)

Two slide-in drawers rendered before the main layout:

**Comments drawer** (`.social-comments-drawer`):
- Slides up from bottom (`translateY(calc(100% + 1.25rem))` → `translateY(0)`)
- 70vh height on mobile, 100dvh in landscape
- Dark background `#171717`
- Header: "Add Comment" button (left) + close button (right)
- Body: `<SocialComments />` in a scrollable shell

**Share drawer** (`.social-share-drawer`):
- Slides down from top-right
- Width: `fit-content`, min-width `19rem`
- Semi-transparent backdrop `rgba(3,10,24,0.88)` with blur 18px
- Header: share title + close button
- Body: `<SocialShare />`

Both drawers use `.social-backdrop` (transparent full-screen click target) to close.

### Layer 2: Top bar overlay

`absolute inset-x-0 top-0 z-[60] h-20 pointer-events-none`

**Left cluster** (`absolute left-2 top-2 z-[62]`):
- Spacer div (40×40px) for safe area on mobile
- Restart button (if `onRestart`) — circular refresh icon
- `<AudioButton muted={muted} onToggle={onToggleMute} />`
- Camera button (if `onCapture`) — dev only

**Center cluster** (`absolute left-1/2 -translate-x-1/2 z-[61]`, `top: 0.5rem`):
- `<LevelButtons />` — if all level props provided
- Progress dots — if `progress` and `progressTotal` provided

Progress dots render as:
```tsx
{dots.map((filled, i) => (
  <div style={{
    width: 14, height: 14, borderRadius: "50%",
    background: filled ? "#67e8f9" : "transparent",
    borderColor: filled ? "#67e8f9" : "rgba(255,255,255,0.26)",
    boxShadow: filled ? "0 0 8px rgba(103,232,249,0.8)" : undefined,
    transform: filled ? "scale(1.15)" : "scale(1)",
    transition: "all 0.3s",
  }} />
))}
```

**Right cluster** (`.social-launchers`):
- `<LanguageSwitcher />`
- `<AutopilotIcon />` — if `onQuestionDemo` provided (shows active state when `isQuestionDemo`)
- Share button (circle-circle-circle SVG icon)
- Comments button (speech bubble SVG icon)

On desktop (`!isCoarsePointer`), `.social-launchers` gets `top: 0.5rem` override.

### Layer 3: Main content area

`relative flex-1 min-h-0 mx-2 mb-2`

**Canvas container** (`absolute inset-0 rounded-xl overflow-hidden`):
- Contains `children` — the game canvas

**Bottom overlay** (`absolute bottom-0 left-0 right-0 flex flex-row items-stretch gap-2`):
- `QuestionBox` — flex-1, min-w-0; click on box toggles keypad minimized state
- `NumericKeypad` — fixed width, controlled minimized state

---

## Keypad minimized state

```ts
// Minimized by default on touch/landscape; expanded on desktop
const [calcMinimized, setCalcMinimized] = useState(() => isMobileLandscape || isCoarsePointer);

// Autopilot overrides: if forceKeypadExpanded, always show grid
const effectiveCalcMinimized = forceKeypadExpanded ? false : calcMinimized;
```

Clicking either the `QuestionBox` or the keypad display toggles `calcMinimized`.

---

## Share handler

```ts
async function handleShare() {
  if (navigator.share) {
    await navigator.share({
      title: t("social.shareTitle"),
      url: "https://interactive-maths.vercel.app/",
    });
  } else {
    setShareDrawerOpen(o => !o);  // fallback: open share drawer
  }
}
```

---

## Component dependencies

```
GameLayout
├── AudioButton          — mute/unmute toggle button
├── AutopilotIcon        — blinking robot icon
├── LanguageSwitcher     — globe icon + language dropdown
├── LevelButtons         — level 1 / level 2 buttons
├── NumericKeypad        — DSEG7 calculator
├── QuestionBox          — question text box with shake animation
├── SocialShare          — Twitter/Facebook/WhatsApp/LinkedIn buttons
└── SocialComments       — DiscussIt iframe
```

---

## `QuestionBox` component

```tsx
// src/components/QuestionBox.tsx
interface QuestionBoxProps {
  shake?: boolean;
  onClick?: () => void;
  children: ReactNode;
}
```

Renders a flex container styled as `.arcade-panel` with `cursor-pointer`.
Applies `animate-shake` class when `shake` is true.

---

## `LevelButtons` component

```tsx
// src/components/LevelButtons.tsx
interface LevelButtonsProps {
  levelCount: number;
  currentLevel: number;
  unlockedLevel: number;
  onSelect: (level: number) => void;
}
```

Renders `levelCount` pill buttons. Levels > `unlockedLevel` are disabled and show
a lock icon. The current level button is highlighted (cyan border + glow).

---

## `AudioButton` component

```tsx
// src/components/AudioButton.tsx
interface AudioButtonProps {
  muted: boolean;
  onToggle: () => void;
}
```

Speaker icon (muted = crossed-out). Uses `.arcade-button` style, 40×40px.

---

## `TutorialHint` component

```tsx
// src/components/TutorialHint.tsx
interface TutorialHintProps {
  show: boolean;
  label: string;  // e.g. t("game.tapAnywhere")
}
```

When `show` is true, renders an animated floating hand cursor with the label text,
centered in the canvas. Uses `.animate-float` (3s infinite bob).
Hidden when `show` is false (render nothing).
