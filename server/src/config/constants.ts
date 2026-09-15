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

// Teen Patti Prediction — Player A (the user) vs Player B (the computer),
// each dealt 3 cards from one shared, shuffled 52-card deck (6 unique cards
// total), compared with standard Teen Patti hand rankings. Because both
// hands are drawn symmetrically from the same shuffle, P(A wins) = P(B
// wins) exactly regardless of hand-type probabilities — swapping which 3
// of the 6 dealt cards go to A vs B doesn't change the joint distribution.
// Verified statistically in server/tests/teenPattiEvaluator.test.ts
// (20000 trials, win share within 45–55%).
//
// A flat 2x payout (same fair-odds pattern as odd/even and color) plus a
// full refund on a tie is *exactly* break-even in expectation regardless
// of the true tie probability: letting p = P(tie), each side wins with
// probability (1-p)/2 for +stake profit, loses with the same probability
// for -stake, and ties with probability p for a wash — the p term drops
// out of the expectation entirely.
export const TEEN_PATTI_PAYOUT_MULTIPLIER = 2;
