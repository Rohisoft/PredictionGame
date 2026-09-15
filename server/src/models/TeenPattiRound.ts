import { Schema, model } from "mongoose";
import { HAND_TYPES, RANKS, SUITS, rankLabel, type Card } from "../utils/teenPattiEvaluator.js";

export const TEEN_PATTI_ROUND_STATUSES = ["betting", "completed", "cancelled"] as const;
export type TeenPattiRoundStatus = (typeof TEEN_PATTI_ROUND_STATUSES)[number];

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
    cards: { type: [cardSchema], default: [] },
    winningHandType: { type: String, enum: HAND_TYPES, default: null },
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
      cards: (ret.cards ?? []).map((c: Card) => ({ rank: rankLabel(c.rank), suit: c.suit })),
      winning_hand_type: ret.winningHandType ?? null,
      created_at: ret.createdAt,
      completed_at: ret.completedAt ?? null,
    };
  },
});

export const TeenPattiRound = model("TeenPattiRound", teenPattiRoundSchema);
