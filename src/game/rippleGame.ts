// ─── Ripple game logic ────────────────────────────────────────────────────────
// This is the game-specific file. Replace with your own game logic.
//
// The structure to follow:
//   - Export a config type describing a round
//   - Export a function to generate a new round from a level
//   - Export any helpers the screen needs

export type Level = 1 | 2;

export interface RoundConfig {
  level: Level;
  /** Number of taps required to complete the round */
  target: number;
  /** Ripple colour for this round */
  rippleColor: string;
  /** Displayed in the question box during the tapping phase */
  tapPrompt: string;
  /** Displayed in the question box during the entry phase */
  entryPrompt: string;
}

const LEVEL_CONFIG: Record<Level, { min: number; max: number; color: string }> = {
  1: { min: 3, max: 3, color: "#67e8f9" }, // cyan
  2: { min: 3, max: 3, color: "#fbbf24" }, // gold
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

/** Pitch (Hz) to play for a ripple, based on tap position (0–1) in the canvas */
export function ripplePitch(normX: number, normY: number): number {
  // Map position to a pentatonic scale: C4 D4 E4 G4 A4 C5
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  const idx = Math.round(normX * (scale.length - 1));
  const pitchVariance = 0.85 + normY * 0.3;
  return scale[idx] * pitchVariance;
}

/** Rainbow palette reused for ripple feedback */
const RAINBOW = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#67e8f9", "#a78bfa", "#f472b6"];

export function getRainbowColor(tapCount: number): string {
  return RAINBOW[tapCount % RAINBOW.length];
}
