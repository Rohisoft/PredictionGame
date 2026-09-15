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

// Strength order, weakest to strongest — matches standard Teen Patti hand
// rankings. Used both to compare two different hand types and (via its
// numeric value) as the first element of a lexicographic comparison.
export const HAND_TYPE_RANK: Record<HandType, number> = {
  highCard: 1,
  pair: 2,
  color: 3,
  sequence: 4,
  pureSequence: 5,
  trail: 6,
};

function sortedRanksDesc(cards: [Card, Card, Card]): [number, number, number] {
  const ranks = cards.map((c) => c.rank);
  ranks.sort((a, b) => b - a);
  return ranks as [number, number, number];
}

/** The rank a sequence is compared by — the ace-low run (A-2-3) is the one exception, always the *lowest* sequence regardless of the ace's numeric value. */
function sequenceTopRank(cards: [Card, Card, Card]): number {
  const ranks = [...cards.map((c) => c.rank)].sort((a, b) => a - b);
  const isAceLow = ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14;
  return isAceLow ? 3 : ranks[2];
}

/**
 * A tuple of numbers that fully determines how strong a hand is *within*
 * its own hand type — compared lexicographically (first difference wins).
 *   trail:                  [triplet rank]
 *   pureSequence/sequence:  [top rank of the run]
 *   color/highCard:         [highest, middle, lowest] (like a poker flush)
 *   pair:                   [pair rank, kicker rank]
 */
function handStrengthKey(cards: [Card, Card, Card], handType: HandType): number[] {
  switch (handType) {
    case "trail":
      return [cards[0].rank];
    case "pureSequence":
    case "sequence":
      return [sequenceTopRank(cards)];
    case "color":
    case "highCard":
      return sortedRanksDesc(cards);
    case "pair": {
      const [r0, r1, r2] = sortedRanksDesc(cards);
      return r0 === r1 ? [r0, r2] : [r1, r0];
    }
  }
}

/**
 * Compares two 3-card hands per standard Teen Patti rules: hand type first
 * (trail beats pure sequence beats sequence beats color beats pair beats
 * high card), then the appropriate within-type tiebreak. Returns positive
 * if `a` is stronger, negative if `b` is stronger, 0 for a genuine tie —
 * which can legitimately happen (e.g. both hands are a pair of Kings with
 * the same kicker rank, just built from different suits) since both hands
 * are dealt from a single shared deck, exactly like a real Teen Patti table.
 */
export function compareHands(a: [Card, Card, Card], b: [Card, Card, Card]): number {
  const typeA = evaluateHand(a);
  const typeB = evaluateHand(b);

  if (HAND_TYPE_RANK[typeA] !== HAND_TYPE_RANK[typeB]) {
    return HAND_TYPE_RANK[typeA] - HAND_TYPE_RANK[typeB];
  }

  const keyA = handStrengthKey(a, typeA);
  const keyB = handStrengthKey(b, typeB);
  for (let i = 0; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i];
  }
  return 0;
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
