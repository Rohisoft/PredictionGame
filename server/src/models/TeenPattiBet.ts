import { Schema, model, Types } from "mongoose";
import { HAND_TYPES } from "../utils/teenPattiEvaluator.js";
import { idOf, isPopulated } from "../utils/serialize.js";

export const TEEN_PATTI_BET_STATUSES = ["pending", "won", "lost", "refunded"] as const;
export type TeenPattiBetStatus = (typeof TEEN_PATTI_BET_STATUSES)[number];

const teenPattiBetSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    roundId: { type: Types.ObjectId, ref: "TeenPattiRound", required: true, index: true },
    selectedHandType: { type: String, enum: HAND_TYPES, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: TEEN_PATTI_BET_STATUSES, required: true, default: "pending", index: true },
    payoutAmount: { type: Number, required: true, default: 0, min: 0 },
    settledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One bet per user per round.
teenPattiBetSchema.index({ roundId: 1, userId: 1 }, { unique: true });
teenPattiBetSchema.index({ createdAt: -1 });

teenPattiBetSchema.set("toJSON", {
  transform(_doc, ret) {
    const out: Record<string, unknown> = {
      id: ret._id.toString(),
      user_id: idOf(ret.userId),
      round_id: idOf(ret.roundId),
      selected_hand_type: ret.selectedHandType,
      amount: ret.amount,
      status: ret.status,
      payout_amount: ret.payoutAmount,
      created_at: ret.createdAt,
      settled_at: ret.settledAt ?? null,
    };

    if (isPopulated(ret.roundId)) {
      out.teen_patti_rounds = ret.roundId;
    }

    return out;
  },
});

export const TeenPattiBet = model("TeenPattiBet", teenPattiBetSchema);
