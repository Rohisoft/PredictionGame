import type { HandType, TeenPattiPlayer } from "@/types/database";

// Display-only — the backend is the sole source of truth for hand
// classification and the winner (server/src/utils/teenPattiEvaluator.ts).
// Used to label each side's dealt hand after the reveal (e.g. "Player A —
// Pair"), ranked weakest to strongest to match standard Teen Patti rules.
export const HAND_TYPE_INFO: Record<HandType, { label: string; description: string }> = {
  highCard: { label: "High Card", description: "No pair, no run, no flush — just the highest card." },
  pair: { label: "Pair", description: "Two cards of the same rank." },
  color: { label: "Color", description: "All 3 cards the same suit, not in a row." },
  sequence: { label: "Sequence", description: "3 consecutive ranks, mixed suits (a \"run\")." },
  pureSequence: { label: "Pure Sequence", description: "3 consecutive ranks, all the same suit." },
  trail: { label: "Trail", description: "3 cards of the same rank — the strongest hand." },
};

export const HAND_TYPE_ORDER: HandType[] = ["trail", "pureSequence", "sequence", "color", "pair", "highCard"];

export const PLAYER_INFO: Record<TeenPattiPlayer, { label: string; sublabel: string }> = {
  playerA: { label: "Player A", sublabel: "You" },
  playerB: { label: "Player B", sublabel: "Computer" },
};
