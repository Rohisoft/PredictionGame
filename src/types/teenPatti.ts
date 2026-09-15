import type { HandType } from "@/types/database";

// Display-only — the backend is the sole source of truth for the actual
// result and payout (server/src/services/teenPattiGameService.ts /
// server/src/config/constants.ts). These mirror those exact fair-odds
// multipliers (1 / true probability of each hand, over a standard 52-card
// deck) purely so the UI can show a user what a correct prediction pays
// before they bet — same pattern as the odd/even and color games already
// hardcoding their own payout copy in their rules panels.
export const HAND_TYPE_INFO: Record<HandType, { label: string; description: string; multiplier: number }> = {
  highCard: { label: "High Card", description: "No pair, no run, no flush — just the highest card.", multiplier: 1.3 },
  pair: { label: "Pair", description: "Two cards of the same rank.", multiplier: 5.9 },
  color: { label: "Color", description: "All 3 cards the same suit, not in a row.", multiplier: 20.2 },
  sequence: { label: "Sequence", description: "3 consecutive ranks, mixed suits (a \"run\").", multiplier: 30.7 },
  pureSequence: { label: "Pure Sequence", description: "3 consecutive ranks, all the same suit.", multiplier: 460.4 },
  trail: { label: "Trail", description: "3 cards of the same rank — the rarest hand.", multiplier: 425 },
};

export const HAND_TYPE_ORDER: HandType[] = ["pair", "sequence", "pureSequence", "color", "trail", "highCard"];
