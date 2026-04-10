import { createRoundForLevel, type Level, type RoundConfig } from "../calculations/index.ts";
import { getRainbowColor, ripplePitch } from "../calculations/shared.ts";

/**
 * Stable screen-facing facade. The mathematical round rules live under
 * `src/calculations/` so they can be reviewed and tested per level.
 */
export function makeRound(level: Level): RoundConfig {
  return createRoundForLevel(level);
}

export { getRainbowColor, ripplePitch };
export type { Level, RoundConfig };
