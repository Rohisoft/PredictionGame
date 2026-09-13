import { Schema, model, Types } from "mongoose";
import { SIDES } from "./GameRound.js";

export const BET_STATUSES = ["pending", "won", "lost", "refunded"] as const;
export type BetStatus = (typeof BET_STATUSES)[number];

const betSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    roundId: { type: Types.ObjectId, ref: "GameRound", required: true, index: true },
    selectedSide: { type: String, enum: SIDES, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: BET_STATUSES, required: true, default: "pending", index: true },
    payoutAmount: { type: Number, required: true, default: 0, min: 0 },
    settledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One bet per user per round — mirrors the unique constraint in the SQL schema.
betSchema.index({ roundId: 1, userId: 1 }, { unique: true });
betSchema.index({ createdAt: -1 });

export const Bet = model("Bet", betSchema);
