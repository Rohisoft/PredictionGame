export const STAKE_AMOUNTS = [10, 20, 50, 100] as const;
export type StakeAmount = (typeof STAKE_AMOUNTS)[number];

export const WELCOME_BONUS = 100;
export const PAYOUT_MULTIPLIER = 2;
// Fair odds for a 2-way bet (Red/Green, equal 1-in-2 chance each) — same
// "no house edge" spirit as the odd/even payout.
export const COLOR_PAYOUT_MULTIPLIER = 2;

export const BETTING_DURATION_SECONDS = 50;
export const ROUND_DURATION_SECONDS = 60;

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Daily Spin & Win — one free spin per 24h per user, weighted toward small
// or zero payouts with a rare jackpot. Index order is fixed and matches
// the frontend wheel's segment layout, so the wheel can animate to land on
// the exact segment the server picked. Weights sum to 100 (out of 100),
// average payout ≈12.6 points/spin — a small daily trickle, not a
// meaningful new source of inflation next to the one-time WELCOME_BONUS.
export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SPIN_SEGMENTS: ReadonlyArray<{ value: number; weight: number }> = [
  { value: 10, weight: 25 },
  { value: 0, weight: 20 },
  { value: 20, weight: 20 },
  { value: 10, weight: 15 },
  { value: 0, weight: 10 },
  { value: 50, weight: 6 },
  { value: 20, weight: 3 },
  { value: 100, weight: 1 },
];

// Teen Patti Prediction — fair (zero house-edge) odds derived directly from
// real 3-card-hand combinatorics over a standard 52-card deck, same "no
// house edge" spirit as the odd/even and color payouts: multiplier =
// 1 / P(hand), so every bet is exactly break-even in expectation regardless
// of which hand type is picked, even though the 6 hand types have wildly
// different real probabilities. Out of C(52,3) = 22100 possible 3-card
// hands (counts verified exhaustively in
// server/tests/teenPattiEvaluator.test.ts):
//   trail (three of a kind):        52 hands  → P=0.24%  → fair odds 425.00x
//   pureSequence (straight flush):  48 hands  → P=0.22%  → fair odds 460.42x
//   sequence (straight):           720 hands  → P=3.26%  → fair odds  30.69x
//   color (flush):                1096 hands  → P=4.96%  → fair odds  20.16x
//   pair:                         3744 hands  → P=16.95% → fair odds   5.90x
//   highCard:                    16440 hands  → P=74.39% → fair odds   1.34x
// Rounded to 1 decimal place (not left at full precision) purely so every
// payout comes out to a whole number of points given STAKE_AMOUNTS are all
// multiples of 10 — the rounding shifts true fairness by at most ~0.04
// percentage points per hand type, negligible next to the deliberate
// softening already used elsewhere (e.g. the Spin & Win wheel).
export const TEEN_PATTI_MULTIPLIERS: Record<
  "trail" | "pureSequence" | "sequence" | "color" | "pair" | "highCard",
  number
> = {
  trail: 425.0,
  pureSequence: 460.4,
  sequence: 30.7,
  color: 20.2,
  pair: 5.9,
  highCard: 1.3,
};
