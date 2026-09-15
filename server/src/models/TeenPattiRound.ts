import { Schema, model } from "mongoose";
import { HAND_TYPES, RANKS, SUITS, rankLabel, type Card } from "../utils/teenPattiEvaluator.js";

export const TEEN_PATTI_ROUND_STATUSES = ["betting", "completed", "cancelled"] as const;
export type TeenPattiRoundStatus = (typeof TEEN_PATTI_ROUND_STATUSES)[number];

export const TEEN_PATTI_WINNERS = ["playerA", "playerB", "tie"] as const;
export type TeenPattiWinner = (typeof TEEN_PATTI_WINNERS)[number];

const cardSchema = new Schema<Card>(
  {
    rank: { type: Number, enum: RANKS, required: true },
    suit: { type: String, enum: SUITS, required: true },
  },
  { _id: false },
);

const teenPattiRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: TEEN_PATTI_ROUND_STATUSES, required: true, default: "betting", index: true },
    bettingStartTime: { type: Date, required: true },
    bettingEndTime: { type: Date, required: true },
    resultTime: { type: Date, required: true },
    // Player A is the user; Player B stands in for a second player and is
    // always the computer, dealt via the same backend-controlled logic —
    // both hands come from one shared, shuffled deck (6 unique cards
    // total), exactly like a real Teen Patti table.
    playerACards: { type: [cardSchema], default: [] },
    playerBCards: { type: [cardSchema], default: [] },
    playerAHandType: { type: String, enum: HAND_TYPES, default: null },
    playerBHandType: { type: String, enum: HAND_TYPES, default: null },
    winner: { type: String, enum: TEEN_PATTI_WINNERS, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

teenPattiRoundSchema.index({ roundNumber: -1 });

teenPattiRoundSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      round_number: ret.roundNumber,
      status: ret.status,
      betting_start_time: ret.bettingStartTime,
      betting_end_time: ret.bettingEndTime,
      result_time: ret.resultTime,
      player_a_cards: (ret.playerACards ?? []).map((c: Card) => ({ rank: rankLabel(c.rank), suit: c.suit })),
      player_b_cards: (ret.playerBCards ?? []).map((c: Card) => ({ rank: rankLabel(c.rank), suit: c.suit })),
      player_a_hand_type: ret.playerAHandType ?? null,
      player_b_hand_type: ret.playerBHandType ?? null,
      winner: ret.winner ?? null,
      created_at: ret.createdAt,
      completed_at: ret.completedAt ?? null,
    };
  },
});

export const TeenPattiRound = model("TeenPattiRound", teenPattiRoundSchema);
