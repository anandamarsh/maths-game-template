# Sound System

**File:** `src/sound/index.ts`

Web Audio API synthesis — no external audio files. All sounds are generated in code
using oscillators and noise. Music is muted by default in development.

---

## Module-level state

```ts
let ctx: AudioContext | null = null;
let musicMuted = import.meta.env.DEV;  // true in dev, false in production
const MUSIC_VOLUME_SCALE = 0.25;
const SFX_VOLUME_SCALE = 1;
```

`ac()` lazily creates the AudioContext and resumes it if suspended:
```ts
function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
```

---

## Core primitives

### `tone(freq, start, dur, vol, type, channel)`

Plays a single oscillator tone:
```ts
function tone(
  freq: number,
  start: number,           // AudioContext time (seconds)
  dur: number,             // duration in seconds
  vol = 0.08,
  type: OscillatorType = "square",
  channel: "sfx" | "music" = "sfx",
)
```
- Vol is scaled by `MUSIC_VOLUME_SCALE` (0.25) for music channel, 1.0 for SFX
- Envelope: constant volume → exponential ramp to 0.001 at `start + dur`

### `noiseBurst(startTime, filterFreq, vol, dur, channel)`

Generates white noise through a bandpass filter:
```ts
function noiseBurst(
  startTime: number,
  filterFreq: number,   // bandpass center frequency
  vol: number,
  dur: number,
  channel: "sfx" | "music" = "sfx",
)
```
- Creates a random audio buffer, bandpass filter (Q=1.8), gain with exponential ramp
- Used for percussive/click textures

---

## Exported SFX functions

### `playRipple(pitch: number = 440)`

Called on each canvas tap. Pitch comes from `ripplePitch()` in game logic.

```ts
export function playRipple(pitch: number = 440) {
  const t = ac().currentTime;
  tone(pitch, t, 0.18, 0.09, "sine");                 // main tone
  tone(pitch * 1.5, t + 0.04, 0.12, 0.05, "triangle"); // harmonic
  noiseBurst(t, 1200, 0.06, 0.04);                    // texture burst
}
```

### `playCorrect()`

Ascending major chord progression:

```ts
export function playCorrect() {
  const t = ac().currentTime;
  tone(110, t, 0.08, 0.18, "sine");          // bass thump
  tone(523.25, t, 0.12, 0.11, "square");     // C5
  tone(659.25, t + 0.06, 0.15, 0.1, "square");  // E5
  tone(783.99, t + 0.12, 0.15, 0.1, "square");  // G5
  tone(1046.5, t + 0.18, 0.22, 0.12, "square"); // C6
  tone(1318.5, t + 0.24, 0.28, 0.09, "triangle"); // E6 fade
}
```

### `playWrong()`

Descending sawtooth — sounds like a losing buzzer:

```ts
export function playWrong() {
  const t = ac().currentTime;
  tone(90, t, 0.1, 0.2, "sine");              // low bass
  tone(440, t, 0.12, 0.12, "sawtooth");       // A4
  tone(349.23, t + 0.1, 0.15, 0.11, "sawtooth"); // F4
  tone(261.63, t + 0.2, 0.18, 0.1, "sawtooth");  // C4
  tone(196, t + 0.3, 0.22, 0.09, "sawtooth");    // G3
}
```

### `playLevelComplete()`

6-note melody played in sequence (0.12s apart):

```ts
export function playLevelComplete() {
  const t = ac().currentTime;
  const melody = [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
  melody.forEach((f, i) => tone(f, t + i * 0.12, 0.2, 0.09));
}
```

Note: also played for each egg collected (on tap when `eggs < EGGS_PER_ROUND`).

### `playButton()`

Two-tone UI click for toolbar buttons:

```ts
export function playButton() {
  const t = ac().currentTime;
  tone(659.25, t, 0.05, 0.06, "square");
  tone(783.99, t + 0.04, 0.05, 0.045, "square");
}
```

### `playKeyClick()`

Sharp percussive tick for keypad button presses:

```ts
export function playKeyClick() {
  const t = ac().currentTime;
  noiseBurst(t, 2600, 0.14, 0.02);     // high-frequency noise burst
  tone(1900, t, 0.026, 0.08, "square"); // high-pitched click
}
```

---

## Mute controls

```ts
export function toggleMute(): boolean  // toggles musicMuted, returns new state
export function isMuted(): boolean     // returns current musicMuted state
export function isMusicOn(): boolean   // returns whether background music is running
```

`toggleMute` only affects background music. SFX always play regardless.
On first user interaction, the screen calls `ensureMusic()` → `startMusic()`.

---

## Background music

### Music pattern type

```ts
interface MusicPattern {
  melody: number[];       // note frequencies, 0 = rest
  bass: number[];         // parallel bass line, 0 = rest
  bpm: number;
  melodyVol?: number;     // default 0.05
  bassVol?: number;       // default 0.04
  melodyType?: OscillatorType;  // default "square"
  bassType?: OscillatorType;    // default "triangle"
}
```

### 4 built-in patterns

**Pattern 1** (bpm: 140) — classic 8-bit, square/triangle:
```ts
melody: [659.25, 659.25, 0, 523.25, 659.25, 0, 783.99, 0, 392, 0, 523.25, 0, 392, 329.63, 440, 493.88]
bass:   [130.81, 0, 130.81, 0, 98.0, 0, 146.83, 0, 98.0, 0, 82.41, 0, 110.0, 0, 123.47, 0]
```

**Pattern 2** (bpm: 155) — faster, square/triangle:
```ts
melody: [783.99, 0, 659.25, 0, 523.25, 587.33, 659.25, 0, 783.99, 0, 880, 0, 783.99, 659.25, 523.25, 0]
bass:   [196.0, 0, 164.81, 0, 130.81, 0, 196.0, 0, 196.0, 0, 220.0, 0, 196.0, 0, 130.81, 0]
melodyType: "square", bassType: "triangle"
```

**Pattern 3** (bpm: 110) — slower, softer, triangle/sine:
```ts
melody: [329.63, 0, 392, 0, 440, 493.88, 523.25, 0, 493.88, 0, 440, 0, 392, 329.63, 293.66, 0]
bass:   [82.41, 0, 98.0, 0, 110.0, 0, 130.81, 0, 110.0, 0, 98.0, 0, 82.41, 0, 73.42, 0]
melodyVol: 0.055, bassVol: 0.035, melodyType: "triangle", bassType: "sine"
```

**Pattern 4** (bpm: 170) — fastest, square/triangle:
```ts
melody: [523.25, 587.33, 659.25, 698.46, 783.99, 0, 659.25, 0, 523.25, 0, 659.25, 0, 783.99, 0, 1046.5, 0]
bass:   [130.81, 0, 164.81, 0, 196.0, 0, 164.81, 0, 130.81, 0, 130.81, 0, 98.0, 0, 130.81, 0]
melodyVol: 0.06
```

### Music control functions

```ts
export function startMusic(): void
// If not already running, picks a random pattern, sets step=0, starts tick loop.

export function shuffleMusic(): void
// Picks a different pattern from current (no immediate restart of the tick).
// Call on handleRestart() to change the song between play sessions.

export function stopMusic(): void
// Halts the tick loop.
```

### Tick loop

```ts
function tick() {
  if (!musicOn) return;
  const t = ac().currentTime;
  const beat = 60 / currentPattern.bpm;
  // Play melody and bass notes for current step
  if (melody[step]) tone(melody[step], t, beat * 0.7, melodyVol, melodyType, "music");
  if (bass[step])   tone(bass[step], t, beat * 0.9, bassVol, bassType, "music");
  step = (step + 1) % melody.length;
  bgTimer = setTimeout(tick, beat * 1000);  // schedule next beat
}
```

Notes last `beat * 0.7` (melody) and `beat * 0.9` (bass) to leave a small gap.

---

## Usage pattern in screens

```ts
import { isMuted, playCorrect, playLevelComplete, playRipple, playWrong,
         shuffleMusic, startMusic, toggleMute } from "../sound";

// Start music on first user interaction:
function ensureMusic() {
  if (!musicStartedRef.current) {
    musicStartedRef.current = true;
    startMusic();
  }
}

// Toggle from UI:
function handleToggleMute() {
  setMuted(toggleMute());
}
```
