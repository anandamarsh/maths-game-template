import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRoundForLevel } from "../../src/calculations/index.ts";
import { getRainbowColor, ripplePitch } from "../../src/calculations/shared.ts";
import { createLevelOneNormalRound } from "../../src/calculations/level-1/normal.ts";
import { createLevelTwoNormalRound } from "../../src/calculations/level-2/normal.ts";

describe("Ripple calculations", () => {
  it("creates the documented Level 1 round values", () => {
    const round = createLevelOneNormalRound(() => 0);
    assert.deepEqual(round, {
      level: 1,
      target: 3,
      rippleColor: "#67e8f9",
      tapPrompt: "Tap the screen — count as you go!",
      entryPrompt: "How many ripples did you make?",
    });
  });

  it("creates the documented Level 2 round values", () => {
    const round = createLevelTwoNormalRound(() => 0.99);
    assert.deepEqual(round, {
      level: 2,
      target: 3,
      rippleColor: "#fbbf24",
      tapPrompt: "Tap the screen — count as you go!",
      entryPrompt: "How many ripples did you make?",
    });
  });

  it("dispatches level selection through the calculations facade", () => {
    assert.equal(createRoundForLevel(1, () => 0).rippleColor, "#67e8f9");
    assert.equal(createRoundForLevel(2, () => 0).rippleColor, "#fbbf24");
  });

  it("maps ripple positions to a stable pitch", () => {
    assert.equal(ripplePitch(0, 0), 261.63 * 0.85);
    assert.equal(ripplePitch(1, 1), 523.25 * 1.15);
  });

  it("cycles rainbow colours by tap count", () => {
    assert.equal(getRainbowColor(0), "#f87171");
    assert.equal(getRainbowColor(7), "#f472b6");
    assert.equal(getRainbowColor(8), "#f87171");
  });
});
