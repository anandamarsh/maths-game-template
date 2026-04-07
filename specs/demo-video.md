# Demo Video Recording

**Files:**
- `src/hooks/useDemoRecorder.ts` — recording state machine + MediaRecorder
- `src/components/DemoIntroOverlay.tsx` — intro/outro slide overlays
- Integration in `src/screens/RippleScreen.tsx` and `src/components/GameLayout.tsx`

---

## What it does

Records a complete demo video of the game being played by autopilot, bookended by
teacher-facing intro and outro slides. The video captures the browser tab (including
all game audio — SFX and music) via `getDisplayMedia()` and produces a downloadable
WebM file.

---

## Recording flow

### 1. Trigger

A video camera button in the dev toolbar (next to the existing screenshot camera button).
Visible only in localhost dev mode, same as the screenshot button.

### 2. Tab capture permission

Calls `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })` with
`preferCurrentTab: true`. The browser shows a one-time permission dialog. Recording
begins immediately after the user grants permission.

### 3. Intro slide (~5 seconds)

A fullscreen overlay with the game's deep-space theme showing:
- **Game icon** (from `/favicon.svg`)
- **Game title:** "Ripple Touch"
- **Subtitle:** "Counting & Number Recognition"
- **Syllabus mapping:** "Early Stage 1 (Kindergarten) — NSW Curriculum"
- **Outcome code:** "MAe-1WM: Demonstrates and describes counting sequences"
- **What it teaches:** "Children learn to count objects and recognise numbers by
  tapping the screen to create ripples, then counting and entering the total."

This slide is designed for a teacher to read in ~5 seconds. It fades in, holds, then
fades out into the game.

### 4. Autopilot gameplay

After the intro fades:
1. Game resets to Level 1 (fresh start)
2. Sound is auto-unmuted (so the recording captures audio)
3. Autopilot activates in continuous mode
4. Plays through **all levels** (Level 1 → Level 2) including the email report modal
   and "Next Level" progression at each level boundary
5. When autopilot completes the final level, an outro slide appears

### 5. Outro slide (~4 seconds)

Fullscreen overlay showing:
- **"Play this and more games at"**
- **SeeMaths logo/link:** `https://www.seemaths.com` (rendered as a visible clickable
  URL — clickable in the actual app, visible as text in the video)
- Fades out, then recording stops

### 6. Download

Recording stops automatically after the outro slide. The WebM file is downloaded to the
user's machine with filename `ripple-touch-demo-{timestamp}.webm`.

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
recording flow calls `ensureUnmuted()` to force-unmute the game before starting.

### Auto-stop

The autopilot's `onAutopilotComplete` callback is wired to trigger the outro slide.
After the outro, `recorder.stop()` fires, which triggers the download via the
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
