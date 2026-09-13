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

export const GameRound = model("GameRound", gameRoundSchema);
