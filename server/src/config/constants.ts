export const STAKE_AMOUNTS = [10, 20, 50, 100] as const;
export type StakeAmount = (typeof STAKE_AMOUNTS)[number];

export const WELCOME_BONUS = 100;
export const PAYOUT_MULTIPLIER = 2;

export const BETTING_DURATION_SECONDS = 50;
export const ROUND_DURATION_SECONDS = 60;

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
