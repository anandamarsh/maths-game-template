export type Level = 1 | 2;

export interface RoundConfig {
  level: Level;
  /** Number of taps required to complete the round. */
  target: number;
  /** Ripple colour used for visual feedback during the round. */
  rippleColor: string;
  /** Prompt shown while the child is still tapping. */
  tapPrompt: string;
  /** Prompt shown when the child must enter the final answer. */
  entryPrompt: string;
}
