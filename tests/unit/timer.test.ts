import { describe, expect, it } from "vitest";
import { diceResultToSide, getRoundPhase, secondsRemaining } from "@/types/game";

describe("getRoundPhase", () => {
  it("is 'betting' before the betting deadline", () => {
    expect(getRoundPhase(1_000, 2_000)).toBe("betting");
  });

  it("is 'result' exactly at the betting deadline", () => {
    expect(getRoundPhase(2_000, 2_000)).toBe("result");
  });

  it("is 'result' after the betting deadline", () => {
    expect(getRoundPhase(3_000, 2_000)).toBe("result");
  });
});

describe("secondsRemaining", () => {
  it("rounds up partial seconds so the display never shows 0 too early", () => {
    expect(secondsRemaining(0, 1_500)).toBe(2);
  });

  it("returns 0 once the target has passed, never negative", () => {
    expect(secondsRemaining(5_000, 1_000)).toBe(0);
  });

  it("computes whole seconds remaining", () => {
    expect(secondsRemaining(0, 10_000)).toBe(10);
  });
});

describe("diceResultToSide", () => {
  it.each([
    [1, "odd"],
    [2, "even"],
    [3, "odd"],
    [4, "even"],
    [5, "odd"],
    [6, "even"],
  ] as const)("maps dice %i to %s", (dice, side) => {
    expect(diceResultToSide(dice)).toBe(side);
  });
});
