import { Schema, model } from "mongoose";

export const ROUND_STATUSES = ["betting", "locked", "completed", "cancelled"] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

export const SIDES = ["odd", "even"] as const;
export type Side = (typeof SIDES)[number];

const gameRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: ROUND_STATUSES, required: true, default: "betting", index: true },
    bettingStartTime: { type: Date, required: true },
    bettingEndTime: { type: Date, required: true },
    resultTime: { type: Date, required: true },
    diceResult: { type: Number, min: 1, max: 6, default: null },
    winningSide: { type: String, enum: SIDES, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

gameRoundSchema.index({ roundNumber: -1 });

gameRoundSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      round_number: ret.roundNumber,
      status: ret.status,
      betting_start_time: ret.bettingStartTime,
      betting_end_time: ret.bettingEndTime,
      result_time: ret.resultTime,
      dice_result: ret.diceResult ?? null,
      winning_side: ret.winningSide ?? null,
      created_at: ret.createdAt,
      completed_at: ret.completedAt ?? null,
    };
  },
});

export const GameRound = model("GameRound", gameRoundSchema);
