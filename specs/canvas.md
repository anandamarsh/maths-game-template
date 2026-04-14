# Canvas & Scene Capture

This file documents the game canvas, its coordinate system and rendering approach, and the dev-only scene capture / square snip tool that every game inherits from the platform.

---

## Canvas approach

Each game chooses its own rendering technology for the playfield:

| Technology | When to use | Examples |
|------------|-------------|---------|
| HTML divs + CSS animations | Simple animated objects (ripples, bouncing items) | Ripple template |
| Inline SVG | Geometric games needing precise hit-testing and coordinate maths | Distance Calculator, Angle Explorer |
| HTML `<canvas>` element | Particle effects, pixel-level drawing | Future games |

The choice must be documented in this file for each game repo.

**Template default (Ripple game):** HTML `<div>` elements with CSS keyframe animations.
The canvas container is `position: absolute; inset: 0; cursor: crosshair`.
`style={{ touchAction: "none" }}` is applied to prevent browser scroll during play.

---

## Coordinate system

For HTML/CSS canvas games, positions are stored as **normalised percentages** (0–100) of the container dimensions.

```ts
interface RipplePosition {
  x: number;  // % from left  (0–100)
  y: number;  // % from top   (0–100)
  color: string;
}
```

For SVG-based games, positions use SVG units defined by the `viewBox`. The game-specific `canvas.md` must document the full coordinate system (origin, axes, key constants).

---

## Background layers (template default, bottom to top)

1. Deep-space radial gradient: `radial-gradient(ellipse at top, #1e3a5f 0%, #080e1c 72%)`
2. `.arcade-grid` overlay at 20% opacity (`pointer-events: none`)
3. SVG star field — 31 hardcoded positions, circles r=1 or r=1.5
4. Game objects (ripples, sprites, diagrams)

New games replace layer 4 entirely. Layers 1–3 are optional platform defaults.

---

## Scene capture (dev-only)

All games on this platform ship with two capture tools that are **only visible on localhost** (`IS_LOCALHOST_DEV` gate). They are used to produce the `public/screenshots/` images and any worksheet/report diagrams.

```ts
const IS_LOCALHOST_DEV =
  IS_DEV &&
  new Set(["localhost", "127.0.0.1", "::1"]).has(globalThis.location?.hostname ?? "");
```

### Full-scene capture

Renders the entire game canvas (SVG or HTML) to a PNG at 2× scale, then invokes `shareOrDownloadPng()`.

- For SVG games: clone the SVG element, serialise to data URL, draw to offscreen `<canvas>`, export PNG
- Embeds any custom fonts as data URLs before serialisation
- Overlays any HUD elements (e.g. odometer panel) that live outside the SVG
- Filename: `{game-slug}-scene-{timestamp}.png`

Triggered by the **camera** toolbar button (left cluster, top bar). Gated to `IS_LOCALHOST_DEV`.

### Square snip tool

A draggable, resizable square crop overlay for capturing a specific region of the canvas as a square PNG. Used to produce question-card diagram thumbnails for the PDF report.

```ts
type SnipSelection = { x: number; y: number; size: number };
type SnipDragState = {
  mode: "move" | "resize";
  pointerId: number;
  startX: number; startY: number;
  initial: SnipSelection;
};
```

Behaviour:
- Activated by a **second camera icon** (dotted-square style) in the toolbar; gated to `IS_LOCALHOST_DEV`
- Overlay is positioned in **client-pixel space**, not in canvas/SVG units — it tracks the visible viewport
- Default selection: centred square, `size = min(vw, vh) × 0.48`, clamped to `[96, 220]px`
- Drag the **centre handle** to move; drag the **bottom-right handle** to resize (always square)
- `clampSnipSelection()` keeps selection within the canvas bounds; minimum size 72px
- On capture: renders full image at 4× scale, crops to selected bounds on an offscreen canvas
- Filename: `{game-slug}-square-snip-{timestamp}.png`

### Snip overlay UI

Rendered only when `IS_LOCALHOST_DEV && snipMode && activeSnipSelection`:

- Semi-transparent dark vignette outside the selection
- Dashed white border around selected square
- Four controls on the border frame:
  - **Camera icon** (top-left): captures the snip
  - **Close icon** (top-right): closes the tool
  - **Drag handle** (centre): `pointer-down` → `mode: "move"`
  - **Resize handle** (bottom-right, circular glowing): `pointer-down` → `mode: "resize"`
- `keydown` Escape closes the tool
- `resize` event re-clamps the selection

### Capture flash

```ts
function triggerCaptureFlash(): void
// Plays camera-shutter SFX (two noise bursts + two tones)
// Shows full-screen white radial-gradient overlay (z-index 120) for 180ms
```

### Share / download

```ts
async function shareOrDownloadPng(blob: Blob, filename: string, title: string, text: string): Promise<void>
// Mobile / PWA: Web Share API
// Desktop: download via <a download> anchor
// Shows toast on success or failure
```

---

## What each game's canvas.md must document

When building a new game, create `specs/canvas.md` in its repo and document:

1. **Rendering technology** — HTML div/CSS, SVG, or `<canvas>` element
2. **Viewport / viewBox** — key dimension constants (W, H, CX, CY, etc.)
3. **Coordinate system** — origin, axis direction, unit-to-pixel mapping
4. **Scene layers** — what is drawn and in what order
5. **Key visual objects** — sprites, diagrams, animations and their positions/sizes
6. **Pointer interaction** — hit-testing logic, drag mechanics if any
7. **Capture notes** — any game-specific overrides to the standard capture pipeline (e.g. font embedding, HUD overlays, odometer panel)

The angle-explorer and distance-calculator repos contain worked examples of a complete `canvas.md`.
