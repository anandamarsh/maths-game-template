# Game Logic

**File:** `src/game/rippleGame.ts`

This is the **only file you replace** when building a new game. Everything else in the
template is game-agnostic. The file exports a config type, a round generator, and
any helpers the screen needs.

---

## Required exports

### `Level` type

```ts
export type Level = 1 | 2;  // extend if you need more levels
```

### `RoundConfig` interface

```ts
export interface RoundConfig {
  level: Level;
  target: number;           // number of canvas interactions required
  rippleColor: string;      // CSS color for the visual effect
  tapPrompt: string;        // shown in question box during tapping phase (currently unused — screen generates this via i18n)
  entryPrompt: string;      // shown in question box during answering phase
}
```

### `makeRound(level: Level): RoundConfig`

Generates a random round for the given level. Uses a `LEVEL_CONFIG` map:

```ts
const LEVEL_CONFIG: Record<Level, { min: number; max: number; color: string }> = {
  1: { min: 3, max: 3, color: "#67e8f9" },  // cyan
  2: { min: 3, max: 3, color: "#fbbf24" },  // gold
};

export function makeRound(level: Level): RoundConfig {
  const { min, max, color } = LEVEL_CONFIG[level];
  const target = min + Math.floor(Math.random() * (max - min + 1));
  return {
    level,
    target,
    rippleColor: color,
    tapPrompt: `Tap the screen — count as you go!`,
    entryPrompt: `How many ripples did you make?`,
  };
}
```

For a new game, change `min`/`max` ranges per level and write your own prompts.

### `ripplePitch(normX: number, normY: number): number`

Maps a normalized tap position (0–1) to a frequency in Hz for `playRipple()`.
The template implementation maps X to a pentatonic scale and modulates by Y:

```ts
export function ripplePitch(normX: number, normY: number): number {
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];  // C4 D4 E4 G4 A4 C5
  const idx = Math.round(normX * (scale.length - 1));
  const pitchVariance = 0.85 + normY * 0.3;  // 0.85 to 1.15
  return scale[idx] * pitchVariance;
}
```

### `getRainbowColor(tapCount: number): string`

Returns one of 8 rainbow colors cycling by tap count:

```ts
const RAINBOW = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#67e8f9","#a78bfa","#f472b6"];

export function getRainbowColor(tapCount: number): string {
  return RAINBOW[tapCount % RAINBOW.length];
}
```

---

## How the screen uses these

```ts
// On mount / new round:
const round = makeRound(level);  // stored in roundRef.current

// On each tap:
const color = getRainbowColor(tapCount);
playRipple(ripplePitch(normX, normY));

// During answering phase:
questionText = roundRef.current.entryPrompt;

// On submit:
const correct = targetTaps;  // = round.target from startNewRound
```

---

## Notes for new games

- You may not use `tapPrompt` directly — the screen generates tapping-phase text via
  `t("game.tapScreen", { count, total })`. You can remove it from `RoundConfig` or
  repurpose it for custom display.
- If your game has different interaction types (drag, draw, etc.), replace the
  `doTap()` logic in the screen while keeping the same phase progression.
- `getRainbowColor` is optional — remove it if your game doesn't use rainbow ripples.
- `ripplePitch` is optional — remove it if your game uses a fixed pitch or no sound.
