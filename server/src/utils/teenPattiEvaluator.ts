// Standard 52-card deck, no jokers. Ranks are numeric (2-14, Ace high) so
// they sort/compare naturally; suits are the four symbols directly, which
// is also exactly what the frontend renders.

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const HAND_TYPES = ["highCard", "pair", "color", "sequence", "pureSequence", "trail"] as const;
export type HandType = (typeof HAND_TYPES)[number];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Classifies a 3-card Teen Patti hand into exactly one of the 6 categories,
 * highest-ranked check first (a trail is never also reported as a "pair",
 * a pure sequence is never also reported as a plain "sequence" or "color").
 *
 * A-2-3 is the one non-numerically-consecutive sequence Teen Patti still
 * treats as valid (Ace low here); every other sequence — including
 * Q-K-A — is already consecutive under Ace=14, and K-A-2 is NOT a valid
 * sequence (Ace never wraps past King on the high side).
 */
export function evaluateHand(cards: [Card, Card, Card]): HandType {
  const ranks = [...cards.map((c) => c.rank)].sort((a, b) => a - b) as [Rank, Rank, Rank];
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
    return "trail";
  }

  const isConsecutive = ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
  const isAceLowStraight = ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14;
  const isSequence = isConsecutive || isAceLowStraight;

  if (isSequence && isFlush) return "pureSequence";
  if (isSequence) return "sequence";
  if (isFlush) return "color";
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) return "pair";
  return "highCard";
}

const RANK_LABELS: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank];
}
