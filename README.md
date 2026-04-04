# Interactive Maths — Game Template

> A fully working starter game for the [Interactive Maths](https://interactive-maths.vercel.app/) platform. Clone this repo, build your game, deploy to Vercel, and submit your URL.

**Live demo:** https://maths-game-template.vercel.app/

---

## What is Interactive Maths?

Interactive Maths is an arcade-style platform of browser-based maths games. Each game is an independent PWA deployed on its own Vercel URL. The platform shell loads them in iframes and provides a home button, navigation, and a game library. This template gives you all the shared infrastructure so you can focus on your game logic.

---

## Quick start

```bash
git clone https://github.com/anandamarsh/maths-game-template.git my-maths-game
cd my-maths-game
npm install
npm run dev        # http://localhost:4003
```

The demo game "Ripple Touch" runs immediately. Tap the canvas to create ripple effects and sound. Collect 10 eggs (every 5 taps = 1 egg).

---

## What you get out of the box

| Feature | Details |
|---|---|
| Game layout | Top bar (controls), canvas area, floating bottom overlay |
| Numeric keypad | DSEG7 LCD display + 12-button grid, minimize/maximize |
| Question box | Styled message display, same height as calculator |
| Progress tracker | Dot-based progress strip (e.g. 10 eggs) |
| Audio | Web Audio SFX + procedural background music, mute toggle |
| Tutorial hint | Animated hand-pointer shown on first interaction |
| Social | Native share sheet / fallback drawer + comments iframe |
| PWA | Installable, offline-capable via Workbox, build-stamped manifest |
| Responsive | Desktop (expanded keypad), mobile landscape (minimised keypad), portrait blocked |
| Stack | React 19 · TypeScript · Vite 8 · Tailwind CSS 4 |

---

## Building your game

### 1 — Game logic: `src/game/`

Rename or replace `rippleGame.ts`. Export whatever your screen needs — typically a `makeRound()` function and any helper types.

### 2 — Game screen: `src/screens/`

Rename `RippleScreen.tsx` to e.g. `FractionScreen.tsx`. The only requirement is that you wrap everything in `<GameLayout>`. Your interactive canvas goes inside it as `children`.

```tsx
<GameLayout
  muted={muted}
  onToggleMute={handleToggleMute}
  onRestart={handleRestart}
  keypadValue={answer}
  onKeypadChange={setAnswer}
  onKeypadSubmit={handleSubmit}
  canSubmit={answer !== ""}
  question="What is 3 + 4?"
  progress={score}
  progressTotal={10}
>
  {/* your canvas here — it fills the space absolutely */}
  <MyCanvas />
</GameLayout>
```

**`GameLayout` props**

| Prop | Type | Description |
|---|---|---|
| `muted` | `boolean` | Whether audio is muted |
| `onToggleMute` | `() => void` | Toggle mute |
| `onRestart` | `() => void` | Optional — shows restart button |
| `keypadValue` | `string` | Controlled calculator display value |
| `onKeypadChange` | `(v: string) => void` | Optional — omit to make keypad read-only |
| `onKeypadSubmit` | `() => void` | Called when ✓ is pressed |
| `canSubmit` | `boolean` | Enables the ✓ button |
| `question` | `ReactNode` | Text/content in the message box |
| `questionShake` | `boolean` | Shake animation on wrong answer |
| `progress` | `number` | Filled dots |
| `progressTotal` | `number` | Total dots |

**Canvas layout rules**

The shell injects a home button at `absolute top-2 left-2` inside your iframe. GameLayout reserves this slot with an invisible spacer — do not remove it.

The canvas is `absolute inset-0` so it always fills its area. The bottom bar (question box + keypad) floats over it — expanding or collapsing the keypad never shifts the canvas content.

### 3 — Wire it up: `src/App.tsx`

Import your screen and render it:

```tsx
import FractionScreen from "./screens/FractionScreen";
export default function App() { return <FractionScreen />; }
```

### 4 — Update manifest: `public/manifest.json`

```json
{
  "id": "maths-fractions",
  "name": "Fraction Fighter",
  "short_name": "Fractions",
  "tags": ["fractions", "arithmetic"],
  "skills": ["fraction recognition", "addition"],
  "subjects": ["maths"],
  "githubUrl": "https://github.com/you/maths-fractions",
  "description": "Build: __BUILD_STAMP__\n\nYour description here."
}
```

Keep `"__BUILD_STAMP__"` — it is automatically replaced with a Sydney-time timestamp + git SHA on every build.

### 5 — Update `index.html`

Change `<title>` and `apple-mobile-web-app-title` to your game name.

### 6 — Replace icons

| File | Size | Used for |
|---|---|---|
| `public/favicon.svg` | vector | browser tab |
| `public/favicon.ico` | 32×32 | fallback |
| `public/icon-192.png` | 192×192 | PWA install |
| `public/icon-512.png` | 512×512 | PWA (any + maskable) |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |

---

## Shared infrastructure (do not modify)

These files implement platform conventions and will be updated in future template releases. Copy them fresh when the template is updated.

| File | What it does |
|---|---|
| `src/components/GameLayout.tsx` | Full game chrome: top bar, canvas area, keypad, social |
| `src/components/NumericKeypad.tsx` | DSEG7 LCD display + 12-button grid |
| `src/components/QuestionBox.tsx` | Styled question/message panel |
| `src/components/AudioButton.tsx` | Mute/unmute toggle button |
| `src/components/TutorialHint.tsx` | Animated hand-pointer tutorial overlay |
| `src/components/RotatePrompt.tsx` | Portrait-mode blocker + shell notification |
| `src/components/Social.tsx` | Share drawer + DiscussIt comments iframe |
| `src/sound/index.ts` | Web Audio SFX + background music engine |
| `src/hooks/useMediaQuery.ts` | `useIsMobileLandscape`, `useIsCoarsePointer` |
| `scripts/stamp-manifest.mjs` | Build-time manifest stamping |

---

## Sound API

```ts
import {
  startMusic, shuffleMusic, stopMusic,
  toggleMute, isMuted,
  playRipple,      // pitch: Hz — plays a sine-wave ripple tone
  playCorrect,     // correct answer SFX
  playWrong,       // wrong answer SFX
  playLevelComplete, // level / egg complete SFX
  playKeyClick,    // keypad button click
} from "../sound";
```

Call `startMusic()` on the first user interaction (the browser requires a gesture before audio can play).

---

## Local port convention

| Port | App |
|---|---|
| 4000 | interactive-maths shell |
| 4001 | maths-distance-calculator |
| 4002 | maths-angle-explorer |
| 4003 | this template |
| 4004+ | your game (pick the next free port) |

Update `vite.config.ts` → `server.port` accordingly.

---

## Deploying & submitting

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo → Deploy (no config needed, Vite is auto-detected)
3. Your URL will be e.g. `https://maths-fractions.vercel.app/`
4. Verify `https://maths-fractions.vercel.app/manifest.json` is accessible
5. Add screenshots to `public/screenshots/` and list them in `manifest.json`
6. Submit your URL to the Interactive Maths library

---

## Tech stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 4** (utility-first, no config file needed)
- **vite-plugin-pwa 1.2.0** with Workbox (service worker, offline cache)
- **DSEG7Classic** font (from `dseg` npm package) for the LCD display
- **Web Audio API** — no audio files, all sounds synthesised at runtime
- **react-share** — social share buttons

> Note: `vite-plugin-pwa@1.2.0` has a peer dependency conflict with Vite 8. The `.npmrc` in this repo sets `legacy-peer-deps=true` to resolve it.
