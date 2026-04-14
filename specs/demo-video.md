# Demo Video Recording

**Files:**
- `src/hooks/useDemoRecorder.ts` — recording state machine + MediaRecorder
- `public/intro.html` — editable standalone intro template used by the recorder
- `public/outro.html` — editable standalone outro template used by the recorder
- `public/seemaths-icon.svg` — shared SeeMaths brand icon for the outro template
  (copied from `/Users/amarshanand/interactive-maths/public/apple-touch-icon.svg`)
- `src/components/DemoIntroOverlay.tsx` — intro/outro slide overlays
- Integration in `src/screens/RippleScreen.tsx` and `src/components/GameLayout.tsx`

---

## What it does

Records a complete demo video of the game being played by autopilot, bookended by
teacher-facing intro and outro slides. The video captures the browser tab (including
the game's existing audio plus a dedicated recording-only soundtrack bus) via
`getDisplayMedia()` and produces a downloadable WebM file.

This file is the template contract for other games in this repo family as well. The
same recording pattern should be reused across the other apps, with only the game-
specific intro copy, branding, autopilot path, and report details swapped out.

---

## Reusable template rules

Other games should copy this pattern exactly:
- Keep intro and outro content in editable standalone HTML files under `public/`.
- Use a plain dark holding screen while waiting on browser capture permission.
- Start the timed intro only after capture permission is granted and recording has
  actually started.
- Keep the intro as a two-phase sequence inside one `intro.html` file.
- Fade from intro into autoplayed gameplay, then show a timed outro before stopping.
- Keep the in-game mute icon visually muted while mixing any recording-only soundtrack
  on a separate audio path.
- Hide the video-record button while recording is active.
- Use demo-safe autopilot data, including a fixed teacher email when required.

---

## Recording flow

### 1. Trigger

A video camera button in the dev toolbar (next to the existing screenshot camera button).
Visible only in localhost dev mode, same as the screenshot button.

### Screenshot tools

- localhost dev only
- the existing camera button still downloads the full scene as a PNG
- a second button appears beside it with a dotted square camera icon
- pressing that button toggles a square snip overlay on top of the scene
- the overlay starts centred, can be dragged, and can be resized while staying a
  square
- a floating camera button on the selection’s top-left corner downloads exactly
  the selected square crop as a PNG
- a close button on the selection’s top-right corner, or pressing `Escape`,
  closes the snip tool

### 2. Tab capture permission

Immediately after the record button is pressed, the app switches the visible scene to
a plain fullscreen holding screen that uses the same dark background as the intro.

Calls `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })` with
`preferCurrentTab: true`. The browser shows a one-time permission dialog. Recording
is requested only after that holding screen has been mounted, so the Chrome prompt
appears after the scene change rather than before it.

While that permission dialog is open, the app stays on that holding screen
indefinitely with no intro timers running. If the user cancels or denies capture, the
app must abort recording setup and return directly to the live game screen.

### 3. Intro slide (10 seconds total, then fade out)

A fullscreen overlay loads `public/intro.html` directly. The intro template is a
single standalone HTML file that internally sequences two readable panels:
- **Game icon** (from `/favicon.svg`)
- **Game title:** "Ripple Touch"
- **Subtitle:** "Counting & Number Recognition"
- **Panel 1:** syllabus mapping plus outcome line
  - "Early Stage 1 (Kindergarten) — NSW Curriculum"
  - "MAe-1WM: Demonstrates and describes counting sequences"
- **Panel 2:** what it teaches
  - "Children learn to count objects and recognise numbers by tapping the screen to
    create ripples, then counting and entering the total."

Layout and typography requirements:
- The recorder intro is not hardcoded in React. It renders `public/intro.html` as-is
  so the same HTML file can be edited manually and reused across projects.
- `public/intro.html` is the authoritative editable template for this intro screen.
- The two intro phases must remain inside that one HTML file rather than being split
  across multiple React overlays or assets.
- The game title and subtitle stay visually unchanged unless that HTML template is
  manually edited.
- The first intro phase must be vertically centered on screen, matching the visual
  balance of the second phase.
- The second intro phase replaces the entire visible intro content with the
  description-only screen rather than leaving the title, subtitle, or curriculum
  lines on screen.
- The bottom description remains left-aligned inside a centered content block.
- Mobile spacing in the template must keep the description block at a readable width
  instead of collapsing into a narrow column.

Timing:
- Total intro exposure is 10 seconds.
- Panel 1 holds for 4 seconds.
- The intro HTML then transitions to Panel 2 for 6 seconds.
- After the 10-second total read time, the recorder overlay fades away into the game.

### 4. Autopilot gameplay

After the intro fades:
1. Game resets to Level 1 (fresh start)
2. Background music stays muted during recording so the muted speaker icon remains
   visible in the game chrome
3. A dedicated recording-only soundtrack starts under the intro, is **not** controlled
   by the mute button, and continues through gameplay and outro
4. The recording-only soundtrack fades in from low volume with the intro and fades out
   with the outro
5. Normal in-game SFX still play and are captured in the recording
6. Autopilot activates in continuous mode
7. Plays through **all levels** (Level 1 → Level 2) including the email report modal
   and "Next Level" progression at each level boundary
8. While recording, the autopilot fills the email field with the demo-only address
   `teacher@myschool.com`
9. When autopilot completes the final level, an outro slide appears

### 5. Outro slide (5 seconds, then fade out)

Fullscreen overlay loads `public/outro.html` directly and shows:
- **"Play this and more games at"**
- **Official SeeMaths icon** from `public/seemaths-icon.svg`
- **SeeMaths logo/link:** `https://www.seemaths.com` (rendered as a visible clickable
  URL — clickable in the actual app, visible as text in the video)
- Holds on screen for 5 seconds, fades out slowly on top of an opaque background, then
  recording stops without revealing the last gameplay frame underneath

### 6. Download

Recording stops automatically after the outro slide. The WebM file is downloaded to the
user's machine with filename `ripple-touch-demo-{timestamp}.webm`.

---

## Required sequence

Template implementations must follow this order exactly:

1. User presses the record-video button.
2. The app switches the screen to a plain dark holding screen.
3. The browser capture prompt appears.
4. While the browser permission dialog is unresolved, that holding screen stays up
   indefinitely and autopilot does not start.
5. If capture is denied or cancelled, the app returns to the game with no recording.
6. After permission is granted, recording starts.
7. The 10-second intro hold begins only after recording has actually started.
8. Inside `public/intro.html`, panel 1 shows for 4 seconds, then panel 2 fully
   replaces it with the description-only screen for 6 seconds.
9. Intro then fades.
10. Autopilot gameplay runs to completion.
11. Outro holds for 5 seconds, then fades.
12. Recording stops only after the outro finishes.

---

## Eggs per round

For demo purposes (and all games going forward), each level requires **2 eggs** instead
of 3. This keeps demo videos shorter and punchier. Change `EGGS_PER_ROUND` from 3 to 2
in `RippleScreen.tsx`.

---

## Technical details

### MediaRecorder configuration

```ts
const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
  ? "video/webm;codecs=vp9,opus"
  : "video/webm;codecs=vp8,opus";

new MediaRecorder(stream, {
  mimeType,
  videoBitsPerSecond: 5_000_000,  // 5 Mbps
});
```

### Audio capture

`getDisplayMedia({ audio: true })` captures tab audio (Web Audio API output). The
recording flow keeps the background-music mute state active so the muted speaker icon
remains visible while SFX continue to be captured. A separate recording soundtrack bus
is mixed into the tab audio specifically for video capture and is not affected by the
in-game mute button.

### Auto-stop

The autopilot's `onAutopilotComplete` callback is wired to trigger the outro slide.
The real recording session starts only after the intro overlay is already mounted and
capture permission has been granted. It continues across intro → gameplay → outro.
After the outro fade, `recorder.stop()` fires, which triggers the download via the
`onstop` handler.

### Stream cleanup

When the user stops sharing (via browser UI) or recording stops, all stream tracks are
stopped and refs are cleaned up.

---

## UI integration

### Video record button (dev-only, GameLayout)

Add an `onRecordDemo` optional prop to `GameLayoutProps`. When provided, render a video
camera icon button immediately after the screenshot button. Same styling as other
toolbar buttons.

SVG: a video camera icon (clapperboard or camcorder outline).

### Recording indicator

While recording is active (`isRecording` is true), show a small pulsing red dot in the
top-left corner of the screen so the developer knows recording is in progress.

### Toolbar state during recording

- The standard audio button remains visible and should stay in its muted visual state.
- The demo record button is hidden while recording is in progress rather than changing
  into a different icon.

---

## Future: YouTube upload

The spec anticipates automatic YouTube upload via the YouTube Data API v3:

1. Add `YOUTUBE_CLIENT_ID` to environment variables
2. After recording, offer "Upload to YouTube" button alongside download
3. OAuth 2.0 popup flow → user authorises with Google account
4. `POST` the WebM blob to `https://www.googleapis.com/upload/youtube/v3/videos`
5. Auto-fill title: "Ripple Touch — How to Play"
6. Auto-fill description with game objective + SeeMaths link

This is **not implemented yet** — current version only downloads the file. The YouTube
upload will be added in a future iteration.
