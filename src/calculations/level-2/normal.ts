import type { RoundConfig } from "../types.ts";

const LEVEL_TWO_TARGET = {
  min: 3,
  max: 3,
  color: "#fbbf24",
} as const;

/**
 * Builds the exact answer-checking rules for a standard Level 2 round.
 * The random source is injectable so unit tests can prove the arithmetic.
 */
export function createLevelTwoNormalRound(random: () => number = Math.random): RoundConfig {
  const span = LEVEL_TWO_TARGET.max - LEVEL_TWO_TARGET.min + 1;
  const target = LEVEL_TWO_TARGET.min + Math.floor(random() * span);
  return {
    level: 2,
    target,
    rippleColor: LEVEL_TWO_TARGET.color,
    tapPrompt: "Tap the screen — count as you go!",
    entryPrompt: "How many ripples did you make?",
  };
}
