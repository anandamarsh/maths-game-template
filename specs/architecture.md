# Architecture & CSS System

## Entry point

**`index.html`** — single-page app shell:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0d1b35" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ripple" />   <!-- update per game -->
    <title>Ripple Touch</title>                                    <!-- update per game -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`src/main.tsx`** — React 19 strict mode mount:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
```

**`src/App.tsx`** — wraps the screen in `I18nProvider`:
```tsx
import { I18nProvider } from './i18n'
import RippleScreen from './screens/RippleScreen'
export default function App() {
  return <I18nProvider><RippleScreen /></I18nProvider>
}
```

---

## TypeScript config

`tsconfig.json` references `tsconfig.app.json` and `tsconfig.node.json`.

`tsconfig.app.json` key settings:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "jsx": "react-jsx"
  }
}
```

---

## Vite config (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
```

Key config:
- `base: '/'`
- Dev server: `port: 4003, strictPort: true`
- Plugins: react, tailwindcss, `localApiPlugin()`, VitePWA

**`localApiPlugin()`** — custom Vite plugin that reads `.env.local` and mounts
two dev middleware routes that mirror the Vercel serverless functions:
- `POST /api/translate` → calls OpenAI
- `POST /api/send-report` → calls Resend

This ensures the same API surface works in dev and production.

**VitePWA** config:
```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
  manifest: false,  // manifest.json is manually managed in public/
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    runtimeCaching: [{
      urlPattern: /^https:\/\//,
      handler: 'NetworkFirst',
      options: { cacheName: 'external-cache', networkTimeoutSeconds: 10 },
    }],
  },
})
```

---

## CSS system (`src/index.css`)

### Font setup

```css
@import "tailwindcss";

@font-face {
  font-family: 'DSEG7Classic';
  src: url('dseg/fonts/DSEG7-Classic/DSEG7Classic-Regular.woff2') format('woff2'),
       url('dseg/fonts/DSEG7-Classic/DSEG7Classic-Regular.woff') format('woff');
  font-weight: 400;
}
@font-face {
  font-family: 'DSEG7Classic';
  src: url('dseg/fonts/DSEG7-Classic/DSEG7Classic-Bold.woff2') format('woff2'),
       url('dseg/fonts/DSEG7-Classic/DSEG7Classic-Bold.woff') format('woff');
  font-weight: 700;
}

:root {
  font-family: "Courier New", "Lucida Console", monospace;
  color: #f8fafc;
  background: #020617;
}
body { margin: 0; }
#root { min-height: 100svh; }
```

### Keyframe animations

| Name | Description | Usage |
|------|-------------|-------|
| `bounce-in` | scale 0.3→1.08→1, opacity 0→1 | modal entry |
| `shake` | horizontal ±8px wobble | wrong answer |
| `pop` | scale 1→1.18→1 | button press |
| `float` | vertical ±8px sine, 3s | tutorial hint |
| `ripple-expand` | scale 0→1, opacity 0.9→0 | tap ripples |
| `keypad-display-finger-fade` | opacity 0.35↔1 | keypad idle hint |
| `autopilot-blink` | opacity 0.3↔1, glow 0→14px, 2s | autopilot robot icon |

Utility classes:
```css
.animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.36,0.07,0.19,0.97); }
.animate-shake     { animation: shake 0.4s ease-in-out; }
.animate-pop       { animation: pop 0.3s ease-in-out; }
.animate-float     { animation: float 3s ease-in-out infinite; }
```

### Arcade utility classes

**.font-arcade** — monospace with 0.06em letter spacing.

**.arcade-grid** — dark grid background (22×22px, white lines at 6% opacity).
Used on the outermost game container div.

**.arcade-panel** — game widget panel:
```css
border: 4px solid rgba(255,255,255,0.7);
border-radius: 14px;
background: rgba(15, 23, 42, 0.97);
box-shadow: 0 0 0 4px rgba(15,23,42,0.8), 0 18px 40px rgba(0,0,0,0.3);
```

**.digital-meter** — DSEG7 numeric display style:
```css
font-family: 'DSEG7Classic', "Courier New", monospace;
font-weight: 700;
letter-spacing: 0.12em;
text-shadow: 0 0 14px rgba(103,232,249,0.6);
font-variant-numeric: tabular-nums lining-nums;
```

**.arcade-button** — orange pill button with yellow border:
```css
border: 3px solid #fef08a;
border-radius: 9999px;
background: linear-gradient(180deg, #f97316, #ea580c);
color: white;
font-weight: 900;
letter-spacing: 0.1em;
text-transform: uppercase;
```
`.arcade-button:active` depresses 2px.

### Social CSS classes

All social classes are defined in `index.css` (not Tailwind).
See `specs/social.md` for the full list and their roles.

---

## Device detection hooks (`src/hooks/useMediaQuery.ts`)

```ts
export function useIsMobileLandscape(): boolean
// true if: touch device AND orientation === landscape

export function useIsCoarsePointer(): boolean
// true if: matchMedia("(pointer: coarse)") — i.e. touch device
```

Both hooks use `window.matchMedia` and update on change.

---

## Package scripts

```json
"dev":     "vite --port 4003"
"build":   "tsc -b && vite build"
"lint":    "eslint ."
"preview": "vite preview"
```

---

## Key constants (defined in `RippleScreen.tsx`, per-game)

```ts
const RIPPLE_DURATION_MS = 900       // ms ripple animation lasts
const EGGS_PER_ROUND = 3             // progress dots per level
const LEVEL_COUNT = 2                // total number of levels
const AUTOPILOT_EMAIL = "your@email.com"  // email autopilot fills in
const IS_LOCALHOST_DEV = window.location.hostname === "localhost" || ...
```

`IS_LOCALHOST_DEV` enables the dev-only screenshot capture button.
