export const STAKE_AMOUNTS = [10, 20, 50, 100] as const;
export type StakeAmount = (typeof STAKE_AMOUNTS)[number];

export const WELCOME_BONUS = 100;
export const PAYOUT_MULTIPLIER = 2;

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
