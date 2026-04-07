# Maths Game Template — Specs

This folder is the **single source of truth** for building any game on this template.
Reading every file in this folder should give an LLM enough information to reconstruct
the entire codebase from scratch without inspecting any source files.

---

## What this template is

An interactive maths game framework. Each game has:
- A **canvas area** where the child interacts (tap, drag, etc.)
- A **question** the child answers using a numeric keypad
- A **progress tracker** (eggs / dots)
- A **session report** emailed as a PDF at level completion
- **Autopilot** for demos and end-to-end testing
- **i18n** for 5 built-in languages + on-demand OpenAI translation
- **Sound** synthesised with Web Audio API (no files needed)
- **Social sharing** + embedded comments
- **PWA** support for offline play

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI framework | React 19 (strict mode) |
| Language | TypeScript 5.9, strict mode |
| Bundler | Vite 8 + `@vitejs/plugin-react` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Fonts | DSEG7Classic (numeric display) via `dseg` npm package |
| PDF | jsPDF 4 |
| Canvas capture | html2canvas |
| Social sharing | react-share |
| API / email | Vercel serverless (`api/*.ts`) + Resend |
| Translation | OpenAI GPT-4o-mini via `/api/translate` |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Playwright |
| Dev server port | **4003** (hard-coded in `vite.config.ts`) |

---

## Directory structure

```
/
├── api/
│   ├── send-report.ts        # Vercel serverless: email PDF via Resend
│   └── translate.ts          # Vercel serverless: on-demand OpenAI translation
├── public/
│   ├── favicon.ico / favicon.svg
│   ├── apple-touch-icon.png
│   ├── icon-192.png / icon-512.png
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── AudioButton.tsx
│   │   ├── AutopilotIcon.tsx
│   │   ├── GameLayout.tsx        # ← master layout, wrap every game in this
│   │   ├── LanguageSwitcher.tsx
│   │   ├── LevelButtons.tsx
│   │   ├── NumericKeypad.tsx
│   │   ├── PhantomHand.tsx
│   │   ├── QuestionBox.tsx
│   │   ├── RotatePrompt.tsx
│   │   ├── SessionReportModal.tsx
│   │   ├── Social.tsx
│   │   └── TutorialHint.tsx
│   ├── game/
│   │   └── rippleGame.ts         # ← REPLACE THIS for each new game
│   ├── hooks/
│   │   ├── useAutopilot.ts
│   │   ├── useCheatCode.ts
│   │   └── useMediaQuery.ts
│   ├── i18n/
│   │   ├── en.ts / zh.ts / es.ts / ru.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── report/
│   │   ├── generatePdf.ts
│   │   ├── sessionLog.ts
│   │   └── shareReport.ts
│   ├── screens/
│   │   └── RippleScreen.tsx      # ← main game screen, rename per game
│   ├── sound/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/
│   ├── autopilot.spec.ts
│   ├── email.spec.ts
│   ├── i18n.spec.ts
│   └── screenshots.spec.ts
├── index.html
├── package.json
├── vite.config.ts
├── vercel.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── playwright.config.ts
```

---

## Feature index

| Feature | Spec | Key files |
|---------|------|-----------|
| [Architecture & CSS](./architecture.md) | `specs/architecture.md` | `index.css`, `index.html`, `App.tsx`, `main.tsx` |
| [Game Loop](./game-loop.md) | `specs/game-loop.md` | `screens/RippleScreen.tsx` |
| [Game Layout](./game-layout.md) | `specs/game-layout.md` | `components/GameLayout.tsx` |
| [Game Logic](./game-logic.md) | `specs/game-logic.md` | `game/rippleGame.ts` |
| [Numeric Keypad](./numeric-keypad.md) | `specs/numeric-keypad.md` | `components/NumericKeypad.tsx` |
| [Sound System](./sound-system.md) | `specs/sound-system.md` | `sound/index.ts` |
| [Session Reporting](./session-reporting.md) | `specs/session-reporting.md` | `report/` |
| [Autopilot](./autopilot.md) | `specs/autopilot.md` | `hooks/useAutopilot.ts`, `components/PhantomHand.tsx`, `components/AutopilotIcon.tsx` |
| [Cheat Codes](./cheat-codes.md) | `specs/cheat-codes.md` | `hooks/useCheatCode.ts` |
| [i18n](./i18n.md) | `specs/i18n.md` | `i18n/`, `components/LanguageSwitcher.tsx`, `api/translate.ts` |
| [Social & Comments](./social.md) | `specs/social.md` | `components/Social.tsx` |
| [Deployment & PWA](./deployment.md) | `specs/deployment.md` | `vite.config.ts`, `vercel.json`, `public/manifest.json` |
| [Demo Video](./demo-video.md) | `specs/demo-video.md` | `hooks/useDemoRecorder.ts`, `components/DemoIntroOverlay.tsx` |

---

## Building a new game

1. **Copy this repo** as a starting point.
2. **Rename** `src/game/rippleGame.ts` → `src/game/yourGame.ts`. Implement the same exports: `RoundConfig`, `makeRound(level)`, and any helpers the screen needs. See `specs/game-logic.md`.
3. **Rename** `src/screens/RippleScreen.tsx` → `src/screens/YourScreen.tsx`. Wire up the new game logic. Keep all the template machinery (autopilot, cheat codes, session log, keypad, layout). See `specs/game-loop.md`.
4. **Update i18n strings** in `src/i18n/en.ts` (and all locale files) for any game-specific text. See `specs/i18n.md`.
5. **Update `shareReport.ts`** constants (`GAME_NAME`, `CURRICULUM_BY_LEVEL`, etc.) for the new game.
6. **Update `index.html`** title and `<meta name="apple-mobile-web-app-title">`.
7. **Update `public/manifest.json`** name and short_name.
8. Set env vars (`RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY`) in Vercel and `.env.local`.
