# Deployment & PWA

---

## Environment variables

### `.env.local` (development)

```
OPENAI_API_KEY=sk-...       # on-demand translation via /api/translate
RESEND_API_KEY=re_...       # email delivery via /api/send-report
EMAIL_FROM=noreply@yourdomain.com   # verified Resend sender address
```

Vite's `localApiPlugin()` in `vite.config.ts` reads `.env.local` manually (does not use
Vite's env system) and populates `process.env` for the dev middleware.

### Vercel (production)

Set the same three vars in the Vercel project settings:
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Vercel auto-discovers `api/*.ts` as serverless functions.

---

## Vercel config (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" },
        { "key": "Permissions-Policy",      "value": "web-share=*" },
        { "key": "X-Frame-Options",         "value": "ALLOWALL" }
      ]
    }
  ]
}
```

These headers allow the game to be embedded in iframes from any origin and enable
the Web Share API from within iframes.

---

## PWA (`public/manifest.json`)

Update for each game:
```json
{
  "name": "Ripple Touch",
  "short_name": "Ripple",
  "description": "An interactive maths counting game",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#020617",
  "theme_color": "#0d1b35",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service worker

`vite-plugin-pwa` with `registerType: 'autoUpdate'` generates a service worker that:
- Pre-caches all `*.{js,css,html,ico,png,svg,woff,woff2}` files
- Uses NetworkFirst for all HTTPS requests (10s timeout, falls back to cache)

---

## Rotate prompt (`src/components/RotatePrompt.tsx`)

```tsx
// Props: none
export default function RotatePrompt(): JSX.Element | null
```

Shown when: touch device in **portrait** orientation (detected via `useMediaQuery`).

Renders a full-screen overlay with:
- Rotation animation (SVG phone icon rotating)
- `t("rotate.heading")` — "Rotate your device"
- `t("rotate.subtext")` — "This game plays best in landscape mode"

Attempts to lock screen orientation to landscape on mount:
```ts
screen.orientation?.lock?.("landscape").catch(() => {})
```

If embedded in an iframe, also posts a message to the parent:
```ts
window.parent.postMessage({ type: "request-landscape" }, "*");
```

---

## Playwright test config (`playwright.config.ts`)

```ts
{
  testDir: './tests',
  timeout: 120_000,    // 2 min — enough for autopilot to play 2 full levels
  use: {
    baseURL: 'http://localhost:4003',
    viewport: { width: 1280, height: 800 },
    headless: false,   // watch autopilot play
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4003',
    reuseExistingServer: !process.env.CI,
  },
}
```

---

## Build & deploy

```bash
npm run dev      # dev server on localhost:4003 with live API middleware
npm run build    # TypeScript check + Vite production bundle → dist/
npm run preview  # serve dist/ locally
```

Push to main → Vercel auto-deploys. Serverless functions in `api/` are deployed
alongside the static site.

---

## Icon requirements

| File | Size | Usage |
|------|------|-------|
| `public/favicon.ico` | any | browser tab |
| `public/favicon.svg` | scalable | browser tab (modern) + PDF icon |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `public/icon-192.png` | 192×192 | Android PWA |
| `public/icon-512.png` | 512×512 | PWA splash + PDF fallback |

The PDF generator (`generatePdf.ts`) tries `/favicon.svg` first, falls back to
`/icon-512.png` if SVG rendering fails.
