import { Schema, model, Types } from "mongoose";
import { SIDES } from "./GameRound.js";
import { idOf, isPopulated } from "../utils/serialize.js";

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

betSchema.set("toJSON", {
  transform(_doc, ret) {
    const out: Record<string, unknown> = {
      id: ret._id.toString(),
      user_id: idOf(ret.userId),
      round_id: idOf(ret.roundId),
      selected_side: ret.selectedSide,
      amount: ret.amount,
      status: ret.status,
      payout_amount: ret.payoutAmount,
      created_at: ret.createdAt,
      settled_at: ret.settledAt ?? null,
    };

    // When `.populate("roundId", ...)` was used, ret.roundId is already the
    // populated GameRound's own transformed (snake_case) plain object — see
    // betService.getMyBetHistory(). Expose it the same way the old
    // Postgres/Supabase nested-select did: as `game_rounds`.
    if (isPopulated(ret.roundId)) {
      out.game_rounds = ret.roundId;
    }

    return out;
  },
});

export const Bet = model("Bet", betSchema);
