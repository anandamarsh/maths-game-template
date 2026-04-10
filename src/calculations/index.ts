import { createLevelOneNormalRound } from "./level-1/normal.ts";
import { createLevelTwoNormalRound } from "./level-2/normal.ts";
import type { Level, RoundConfig } from "./types.ts";

/**
 * Dispatches to the explicit level calculator so the screen-facing facade can
 * stay small and stable.
 */
export function createRoundForLevel(level: Level, random: () => number = Math.random): RoundConfig {
  if (level === 1) {
    return createLevelOneNormalRound(random);
  }
  return createLevelTwoNormalRound(random);
}

export type { Level, RoundConfig } from "./types.ts";
