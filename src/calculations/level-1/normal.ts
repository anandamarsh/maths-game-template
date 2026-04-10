import type { RoundConfig } from "../types.ts";

const LEVEL_ONE_TARGET = {
  min: 3,
  max: 3,
  color: "#67e8f9",
} as const;

/**
 * Builds the exact answer-checking rules for a standard Level 1 round.
 * The random source is injectable so unit tests can prove the arithmetic.
 */
export function createLevelOneNormalRound(random: () => number = Math.random): RoundConfig {
  const span = LEVEL_ONE_TARGET.max - LEVEL_ONE_TARGET.min + 1;
  const target = LEVEL_ONE_TARGET.min + Math.floor(random() * span);
  return {
    level: 1,
    target,
    rippleColor: LEVEL_ONE_TARGET.color,
    tapPrompt: "Tap the screen — count as you go!",
    entryPrompt: "How many ripples did you make?",
  };
}
