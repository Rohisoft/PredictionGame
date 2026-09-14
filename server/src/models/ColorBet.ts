import { Schema, model, Types } from "mongoose";
import { COLORS } from "./ColorRound.js";
import { idOf, isPopulated } from "../utils/serialize.js";

export const COLOR_BET_STATUSES = ["pending", "won", "lost", "refunded"] as const;
export type ColorBetStatus = (typeof COLOR_BET_STATUSES)[number];

const colorBetSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    roundId: { type: Types.ObjectId, ref: "ColorRound", required: true, index: true },
    selectedColor: { type: String, enum: COLORS, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: COLOR_BET_STATUSES, required: true, default: "pending", index: true },
    payoutAmount: { type: Number, required: true, default: 0, min: 0 },
    settledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One bet per user per round.
colorBetSchema.index({ roundId: 1, userId: 1 }, { unique: true });
colorBetSchema.index({ createdAt: -1 });

colorBetSchema.set("toJSON", {
  transform(_doc, ret) {
    const out: Record<string, unknown> = {
      id: ret._id.toString(),
      user_id: idOf(ret.userId),
      round_id: idOf(ret.roundId),
      selected_color: ret.selectedColor,
      amount: ret.amount,
      status: ret.status,
      payout_amount: ret.payoutAmount,
      created_at: ret.createdAt,
      settled_at: ret.settledAt ?? null,
    };

    if (isPopulated(ret.roundId)) {
      out.color_rounds = ret.roundId;
    }

    return out;
  },
});

export const ColorBet = model("ColorBet", colorBetSchema);
