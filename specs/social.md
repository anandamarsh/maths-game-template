# Social Sharing & Comments

**File:** `src/components/Social.tsx`

---

## `SocialShare` component

Renders a row of share buttons for Twitter, Facebook, WhatsApp, and LinkedIn.
Uses `react-share` library.

```tsx
export function SocialShare(): JSX.Element
```

Share URL: `"https://interactive-maths.vercel.app/"` (update per deployment).
Share title: `"Play {GAME_NAME} — a free interactive maths game!"`.

Displayed in the share drawer in `GameLayout`.

---

## `SocialComments` component

Embeds a DiscussIt iframe for in-game comments.

```tsx
export function SocialComments(): JSX.Element
```

Renders an `<iframe>` pointing to DiscussIt (embedded comment widget).
The iframe fills the `.social-comments-shell` scrollable container.

---

## `openCommentsComposer()`

```ts
export function openCommentsComposer(): void
// Posts a postMessage to the DiscussIt iframe to open its compose area.
```

Called by the "Add Comment" button in the comments drawer header.

---

## Social CSS (defined in `index.css`)

All social classes use non-Tailwind CSS:

### Launcher buttons (top-right cluster)

```css
.social-launchers {
  position: absolute; top: 0.9rem; right: 0.85rem; z-index: 61;
  display: flex; gap: 0.55rem;
}
.social-launcher {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; padding: 0.5rem;
  /* inherits .arcade-button styles */
}
.social-launcher:hover, .social-launcher.is-active {
  transform: translateY(-2px); filter: brightness(1.03);
}
```

Mobile landscape override (`hover: none, pointer: coarse, orientation: landscape`):
- `top: calc(env(safe-area-inset-top) + 0.5rem)`
- `right: 0.4rem`
- `gap: 0.45rem`

### Backdrop (click-to-close layer)

```css
.social-backdrop {
  position: absolute; inset: 0;
  z-index: 2147483646;  /* max - 1 */
  background: transparent;
}
```

### Drawer base

```css
.social-drawer {
  position: absolute; z-index: 2147483647;
  border-radius: 1.15rem;
  background: rgba(3,10,24,0.88); backdrop-filter: blur(18px);
  opacity: 0; pointer-events: none;
  transition: transform 240ms ease, opacity 180ms ease;
}
.social-drawer.is-open {
  transform: translateY(0); opacity: 1; pointer-events: auto;
}
```

### Share drawer (top-right, slides down)

```css
.social-share-drawer {
  top: 0; right: 0;
  width: fit-content; min-width: 19rem;
  padding: 1rem 1rem 0.9rem;
  border: 1px solid rgba(34,211,238,0.42);
  box-shadow: 0 0 24px rgba(34,211,238,0.16);
  border-radius: 0 0 0 1.15rem;
  transform: translateY(-1.1rem);  /* slides from above */
}
```

Mobile: `min-width: 17rem`.

### Comments drawer (slides up from bottom)

```css
.social-comments-drawer {
  left: 0; right: 0; bottom: 0;
  width: 100vw; height: 70vh;
  padding: 1rem 1rem 1.15rem;
  border-radius: 0;
  border-top: 1px solid rgba(250,204,21,0.46);
  background: #171717;
  transform: translateY(calc(100% + 1.25rem));  /* starts below viewport */
  display: flex; flex-direction: column;
}
.social-comments-shell {
  flex: 1; min-height: 0; overflow-y: auto;
}
```

Mobile/landscape: `height: 100dvh; max-height: 100dvh`.
Adds `padding-bottom: max(1rem, env(safe-area-inset-bottom))` on mobile.

### Add Comment button

```css
.social-new-comment {
  border: 1px solid rgba(250,204,21,0.7);
  border-radius: 999px;
  background: #facc15; color: #111111;
  font-size: 0.76rem; font-weight: 900;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.55rem 0.95rem;
}
```

### Drawer header

```css
.social-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; margin-bottom: 1rem;
}
.social-drawer-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem;
  border: 0; background: transparent; color: #cbd5e1;
}
.social-close-icon { width: 1.1rem; height: 1.1rem; }
```

---

## `GameLayout` share wiring

```ts
async function handleShare() {
  if (navigator.share) {
    await navigator.share({ title: t("social.shareTitle"), url: "https://..." });
  } else {
    setShareDrawerOpen(o => !o);  // fallback: show share drawer
  }
}
```

The share button in the toolbar calls `handleShare()`.
The comments button toggles `setCommentsOpen()`.
