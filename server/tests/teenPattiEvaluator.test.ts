import { describe, expect, it } from "vitest";
import { buildDeck, compareHands, evaluateHand, type Card, type HandType } from "../src/utils/teenPattiEvaluator.js";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function dealSix(deck: Card[]): [[Card, Card, Card], [Card, Card, Card]] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [
    [shuffled[0], shuffled[1], shuffled[2]],
    [shuffled[3], shuffled[4], shuffled[5]],
  ];
}

describe("evaluateHand — known hands", () => {
  it("recognizes a trail (three of a kind)", () => {
    expect(evaluateHand([card(7, "♠"), card(7, "♥"), card(7, "♦")])).toBe("trail");
  });

  it("recognizes a pure sequence (consecutive ranks, same suit)", () => {
    expect(evaluateHand([card(5, "♠"), card(6, "♠"), card(7, "♠")])).toBe("pureSequence");
  });

  it("recognizes A-2-3 as a pure sequence when same suit (ace-low straight flush)", () => {
    expect(evaluateHand([card(14, "♥"), card(2, "♥"), card(3, "♥")])).toBe("pureSequence");
  });

  it("recognizes Q-K-A as a sequence (ace-high, no wraparound needed)", () => {
    expect(evaluateHand([card(12, "♠"), card(13, "♥"), card(14, "♦")])).toBe("sequence");
  });

  it("does NOT treat K-A-2 as a sequence (ace never wraps past king)", () => {
    expect(evaluateHand([card(13, "♠"), card(14, "♥"), card(2, "♦")])).toBe("highCard");
  });

  it("recognizes a sequence (consecutive ranks, mixed suits)", () => {
    expect(evaluateHand([card(5, "♠"), card(6, "♥"), card(7, "♦")])).toBe("sequence");
  });

  it("recognizes a color (same suit, not consecutive)", () => {
    expect(evaluateHand([card(2, "♣"), card(5, "♣"), card(9, "♣")])).toBe("color");
  });

  it("recognizes a pair", () => {
    expect(evaluateHand([card(3, "♠"), card(3, "♥"), card(9, "♦")])).toBe("pair");
  });

  it("recognizes a high card", () => {
    expect(evaluateHand([card(2, "♠"), card(5, "♥"), card(9, "♦")])).toBe("highCard");
  });
});

describe("evaluateHand — exhaustive combinatorics", () => {
  it("classifies all C(52,3) = 22100 combinations with the exact known counts", () => {
    const deck = buildDeck();
    const counts: Record<HandType, number> = {
      trail: 0,
      pureSequence: 0,
      sequence: 0,
      color: 0,
      pair: 0,
      highCard: 0,
    };

    let total = 0;
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        for (let k = j + 1; k < deck.length; k++) {
          const hand = evaluateHand([deck[i], deck[j], deck[k]]);
          counts[hand]++;
          total++;
        }
      }
    }

    expect(total).toBe(22100);
    // Exact combinatorial counts — see the derivation in server/src/config/constants.ts.
    expect(counts.trail).toBe(52);
    expect(counts.pureSequence).toBe(48);
    expect(counts.sequence).toBe(720);
    expect(counts.color).toBe(1096);
    expect(counts.pair).toBe(3744);
    expect(counts.highCard).toBe(16440);
  });
});

describe("compareHands — hand type ordering", () => {
  const trail = [card(9, "♠"), card(9, "♥"), card(9, "♦")] as [Card, Card, Card];
  const pureSeq = [card(5, "♠"), card(6, "♠"), card(7, "♠")] as [Card, Card, Card];
  const seq = [card(5, "♠"), card(6, "♥"), card(7, "♦")] as [Card, Card, Card];
  const color = [card(2, "♣"), card(5, "♣"), card(9, "♣")] as [Card, Card, Card];
  const pair = [card(4, "♠"), card(4, "♥"), card(9, "♦")] as [Card, Card, Card];
  const high = [card(2, "♠"), card(6, "♥"), card(10, "♦")] as [Card, Card, Card];

  it("ranks trail > pureSequence > sequence > color > pair > highCard", () => {
    expect(compareHands(trail, pureSeq)).toBeGreaterThan(0);
    expect(compareHands(pureSeq, seq)).toBeGreaterThan(0);
    expect(compareHands(seq, color)).toBeGreaterThan(0);
    expect(compareHands(color, pair)).toBeGreaterThan(0);
    expect(compareHands(pair, high)).toBeGreaterThan(0);
  });

  it("is antisymmetric", () => {
    expect(compareHands(trail, high)).toBe(-compareHands(high, trail));
    expect(compareHands(pair, pair)).toBe(0);
  });
});

describe("compareHands — within-type tiebreaks", () => {
  it("trail: higher rank wins", () => {
    const kings = [card(13, "♠"), card(13, "♥"), card(13, "♦")] as [Card, Card, Card];
    const twos = [card(2, "♠"), card(2, "♥"), card(2, "♦")] as [Card, Card, Card];
    expect(compareHands(kings, twos)).toBeGreaterThan(0);
  });

  it("sequence: higher run wins, and A-2-3 is the lowest run", () => {
    const qka = [card(12, "♠"), card(13, "♥"), card(14, "♦")] as [Card, Card, Card];
    const fiveSixSeven = [card(5, "♠"), card(6, "♥"), card(7, "♦")] as [Card, Card, Card];
    const aceLow = [card(14, "♠"), card(2, "♥"), card(3, "♦")] as [Card, Card, Card];
    const fourFiveSix = [card(4, "♠"), card(5, "♥"), card(6, "♦")] as [Card, Card, Card];

    expect(compareHands(qka, fiveSixSeven)).toBeGreaterThan(0);
    expect(compareHands(aceLow, fourFiveSix)).toBeLessThan(0);
  });

  it("color: compares like a poker flush, highest card first", () => {
    const higherTop = [card(2, "♣"), card(5, "♣"), card(10, "♣")] as [Card, Card, Card];
    const lowerTop = [card(3, "♥"), card(6, "♥"), card(9, "♥")] as [Card, Card, Card];
    expect(compareHands(higherTop, lowerTop)).toBeGreaterThan(0);

    const sameTopHigherSecond = [card(9, "♣"), card(7, "♣"), card(2, "♣")] as [Card, Card, Card];
    const sameTopLowerSecond = [card(9, "♥"), card(4, "♥"), card(3, "♥")] as [Card, Card, Card];
    expect(compareHands(sameTopHigherSecond, sameTopLowerSecond)).toBeGreaterThan(0);
  });

  it("pair: higher pair rank wins regardless of kicker", () => {
    const highPairLowKicker = [card(9, "♠"), card(9, "♥"), card(2, "♦")] as [Card, Card, Card];
    const lowPairHighKicker = [card(4, "♠"), card(4, "♥"), card(13, "♦")] as [Card, Card, Card];
    expect(compareHands(highPairLowKicker, lowPairHighKicker)).toBeGreaterThan(0);
  });

  it("pair: same pair rank falls back to the kicker", () => {
    const higherKicker = [card(9, "♠"), card(9, "♥"), card(13, "♦")] as [Card, Card, Card];
    const lowerKicker = [card(9, "♣"), card(9, "♦"), card(2, "♠")] as [Card, Card, Card];
    expect(compareHands(higherKicker, lowerKicker)).toBeGreaterThan(0);
  });

  it("highCard: compares all three ranks descending, like a flush", () => {
    const a = [card(14, "♠"), card(5, "♥"), card(2, "♦")] as [Card, Card, Card];
    const b = [card(13, "♣"), card(9, "♦"), card(7, "♠")] as [Card, Card, Card];
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it("returns a genuine tie for equal-strength hands built from different suits", () => {
    // Both pairs of Kings (different suit-pairs, since only 4 Kings exist)
    // with the same 5 kicker rank — a real, valid tie in Teen Patti terms.
    const a = [card(13, "♠"), card(13, "♥"), card(5, "♣")] as [Card, Card, Card];
    const b = [card(13, "♦"), card(13, "♣"), card(5, "♠")] as [Card, Card, Card];
    expect(compareHands(a, b)).toBe(0);
  });
});

describe("compareHands — statistical fairness of a symmetric shared-deck deal", () => {
  it("Player A and Player B win roughly equally often over many trials", () => {
    const deck = buildDeck();
    let aWins = 0;
    let bWins = 0;
    let ties = 0;
    const trials = 20_000;

    for (let i = 0; i < trials; i++) {
      const [handA, handB] = dealSix(deck);
      const result = compareHands(handA, handB);
      if (result > 0) aWins++;
      else if (result < 0) bWins++;
      else ties++;
    }

    expect(aWins + bWins + ties).toBe(trials);
    // With true 50/50 odds and 20000 trials, the binomial standard deviation
    // on the win share is small; a >5% skew either way would indicate a
    // real asymmetry bug rather than sampling noise.
    const winShare = aWins / (aWins + bWins);
    expect(winShare).toBeGreaterThan(0.45);
    expect(winShare).toBeLessThan(0.55);
  });
});
