import { describe, expect, it } from "vitest";
import { buildDeck, evaluateHand, type Card, type HandType } from "../src/utils/teenPattiEvaluator.js";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
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
