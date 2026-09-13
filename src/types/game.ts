export const STAKE_AMOUNTS = [10, 20, 50, 100] as const;
export type StakeAmount = (typeof STAKE_AMOUNTS)[number];

export const ROUND_DURATION_SECONDS = 60;
export const BETTING_DURATION_SECONDS = 50;

export type RoundPhase = "betting" | "result";

/** Pure function so it can be unit tested without a clock or network. */
export function getRoundPhase(
  nowMs: number,
  bettingEndTimeMs: number,
): RoundPhase {
  return nowMs < bettingEndTimeMs ? "betting" : "result";
}

export function secondsRemaining(nowMs: number, targetMs: number): number {
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

export function diceResultToSide(diceResult: number): "odd" | "even" {
  return diceResult % 2 === 0 ? "even" : "odd";
}
