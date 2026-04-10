const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] as const;
const RAINBOW = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#67e8f9",
  "#a78bfa",
  "#f472b6",
] as const;

/**
 * Converts a normalized tap position into a musical pitch.
 * X chooses the note, while Y adds a gentle vertical variance.
 */
export function ripplePitch(normX: number, normY: number): number {
  const idx = Math.round(normX * (PENTATONIC_SCALE.length - 1));
  const pitchVariance = 0.85 + normY * 0.3;
  return PENTATONIC_SCALE[idx] * pitchVariance;
}

/**
 * Rotates through a fixed rainbow palette so repeated taps are easy to count.
 */
export function getRainbowColor(tapCount: number): string {
  return RAINBOW[tapCount % RAINBOW.length];
}
