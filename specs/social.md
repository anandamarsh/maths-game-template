# Social Sharing, Comments & Video

**Files:** `src/components/Social.tsx`, `src/components/GameLayout.tsx`

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

## YouTube walkthrough launcher

The top-right launcher cluster also includes a YouTube icon button rendered by `GameLayout`.

Behaviour:
- The button sits directly next to the comments launcher.
- The launcher button matches the `see-maths` YouTube treatment: transparent background, yellow circular border, YouTube logo centered.
- The icon is always shown when `public/manifest.json` contains a valid `videoUrl`.
- `GameLayout` fetches `/manifest.json` on mount, reads `videoUrl`, and converts it to a YouTube embed URL.
- Supported source URL forms include `youtu.be`, standard watch URLs, and Shorts URLs.

### First-time speech bubble

The speech bubble should be positioned relative to the YouTube icon so the full bubble stays visible inside the viewport.

Placement rule:
- If there is enough space above the icon, the bubble may render above it.
- If there is not enough space above, the bubble should render below it.
- The chosen position should prevent the bubble from being clipped off-screen.
- The pointer tail should flip to the edge that faces the icon.

Project note:
- In `see-maths`, the bubble is shown above the icon because the launcher sits near the bottom edge.
- In this template, the bubble is shown below the icon because the launcher sits near the top edge.

Bubble content matches the `see-maths` visual treatment:
- leading circular YouTube icon inside the bubble
- copy comes from i18n key `social.youtubePrompt`
  - English source text: `First time? Look at a video on how to play.`
- dismiss action comes from i18n key `social.youtubeDismiss`
  - English source text: `Don't show again`

Dismissal rules:
- Clicking `Dismiss` hides the bubble.
- Bubble dismissal is persisted in `localStorage` under:

```ts
"maths-game-template:youtube-bubble-dismissed"
```

- The YouTube icon remains visible after dismissal.

### Video modal

Pressing the YouTube icon opens a centered modal player.

Modal rules:
- Width: `80vw`
- Height: `80vh`
- Centered with `transform: translate(-50%, -50%)`
- Contains an embedded YouTube `<iframe>`
- Includes a top-right close button with:
  - red background
  - white `X` label
- Clicking the darkened backdrop also closes the modal
- The iframe uses the embed URL derived from `manifest.json` `videoUrl`

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

### YouTube CTA

```css
.social-video-cta {
  position: relative;
  display: flex;
  align-items: flex-end;
}

.social-video-button {
  width: 2.7rem;
  height: 2.7rem;
  padding: 0;
  background: transparent;
  border: 3px solid #fef08a;
  border-radius: 9999px;
}
```

The speech bubble uses the same visual language as `see-maths`, but is positioned below the icon in this project:

```css
.social-video-bubble {
  position: absolute;
  right: 0;
  top: calc(100% + 0.8rem);
  width: 310px;
  max-width: 310px;
  border: 3px solid #fef08a;
  border-radius: 1.2rem;
  background: linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98));
}
```

The pointer tail is rendered on the top edge so it points upward to the icon.
The bubble remains 310px wide on mobile and desktop.

Reusable placement guidance:
- When the bubble is rendered below the icon, anchor it with `top: calc(100% + gap)` and place the tail on the bubble's top edge.
- When the bubble is rendered above the icon, anchor it with `bottom: calc(100% + gap)` and place the tail on the bubble's bottom edge.
- In either case, keep the full `310px` bubble visible within the viewport.

Inside the bubble:
- `.social-video-bubble-link` lays out the icon shell and copy
- `.social-video-bubble-icon-shell` matches the yellow ring used in `see-maths`
- `.social-video-bubble-dismiss` remains a transparent text button
- bubble text is translated through the existing `useT()` flow, so it changes with the selected language

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

Video modal backdrop adds a dark overlay:

```css
.social-video-backdrop {
  background: rgba(2,6,23,0.72);
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

### Video modal

```css
.social-video-modal {
  position: absolute;
  top: 50%; left: 50%;
  width: 80vw; height: 80vh;
  transform: translate(-50%, -50%);
  border: 4px solid #fef08a;
  border-radius: 1.2rem;
  background: #000;
}

.social-video-modal-close {
  position: absolute;
  top: 0.75rem; right: 0.75rem;
  background: #dc2626;
  color: #fff;
  border-radius: 999px;
}
```

The close control uses an icon stroke, not a literal `"X"` character.
The implementation uses Material UI's `Close` icon component.

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
The YouTube button toggles `setYoutubeModalOpen(true)`.
The bubble body also opens the video modal when pressed.
