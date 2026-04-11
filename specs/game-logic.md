# Game Logic

**Primary facade:** `src/game/rippleGame.ts`

The Ripple template now keeps its answer-generation rules in a dedicated
`src/calculations/` tree so the mathematical parts of the game are easy to review
and unit test in isolation.

## Folder structure

```text
src/
  calculations/
    level-1/
      normal.ts
    level-2/
      normal.ts
    index.ts
    shared.ts
    types.ts
  game/
    rippleGame.ts
```

The screen still talks to `src/game/rippleGame.ts`. That file is now a thin
facade over the calculation modules.

## Core types

### `Level`

```ts
export type Level = 1 | 2;
```

### `RoundConfig`

```ts
export interface RoundConfig {
  level: Level;
  target: number;
  rippleColor: string;
  tapPrompt: string;
  entryPrompt: string;
}
```

## Level calculators

### `src/calculations/level-1/normal.ts`

Exports the pure level 1 round builder:

```ts
export function createLevelOneNormalRound(random = Math.random): RoundConfig
```

Current rule:
- target range: `3..3`
- ripple colour: `#67e8f9`
- answer prompt: `How many ripples did you make?`

### `src/calculations/level-2/normal.ts`

Exports the pure level 2 round builder:

```ts
export function createLevelTwoNormalRound(random = Math.random): RoundConfig
```

Current rule:
- target range: `3..3`
- ripple colour: `#fbbf24`
- answer prompt: `How many ripples did you make?`

## Shared helpers

### `src/calculations/index.ts`

Dispatches from a level to the correct round calculator:

```ts
export function createRoundForLevel(level: Level, random = Math.random): RoundConfig
```

### `src/calculations/shared.ts`

Contains small pure helpers used by the facade:

```ts
export function ripplePitch(normX: number, normY: number): number
export function getRainbowColor(tapCount: number): string
```

These are not answer-checking functions, but they remain in `calculations/`
because they are deterministic, reusable game rules.

## Facade contract

`src/game/rippleGame.ts` continues to export the screen-facing API:

```ts
export function makeRound(level: Level): RoundConfig
export function ripplePitch(normX: number, normY: number): number
export function getRainbowColor(tapCount: number): string
```

## Test strategy

Unit tests live outside `src/` so they can run independently of the app build:

```text
tests/unit/calculations.test.ts
```

The unit tests verify:
- each level dispatches to the correct calculation module
- target generation stays inside the documented range
- deterministic inputs produce deterministic answers
- helper functions such as `ripplePitch` and `getRainbowColor` remain stable

Playwright continues to verify the full player flow end to end.

## Input and cheat-code contract

The template spec is the reference pattern future keypad-driven maths games
should copy.

- Hardware keyboard digits and on-screen keypad digits must both feed the same
  cheat-code buffer.
- `198081` must clear the visible keypad display and start continuous autopilot.
- `197879` must reveal/fill the correct answer and submit it.
- Trigger digits must not remain visible in the display after a cheat code
  fires.

Implementation shape:

```ts
const { processCheatKey } = useCheatCodes({
  "197879": revealAndSubmitAnswer,
  "198081": toggleContinuousAutopilot,
});

function handleKeypadCheatInput(key: string): boolean {
  return processCheatKey(key);
}
```

Then pass `handleKeypadCheatInput` into the keypad via `onKeyInput`.
