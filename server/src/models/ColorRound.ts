import { Schema, model } from "mongoose";

export const COLOR_ROUND_STATUSES = ["betting", "completed", "cancelled"] as const;
export type ColorRoundStatus = (typeof COLOR_ROUND_STATUSES)[number];

export const COLORS = ["red", "green", "violet"] as const;
export type Color = (typeof COLORS)[number];

const colorRoundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: COLOR_ROUND_STATUSES, required: true, default: "betting", index: true },
    bettingStartTime: { type: Date, required: true },
    bettingEndTime: { type: Date, required: true },
    resultTime: { type: Date, required: true },
    winningColor: { type: String, enum: COLORS, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

colorRoundSchema.index({ roundNumber: -1 });

colorRoundSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      round_number: ret.roundNumber,
      status: ret.status,
      betting_start_time: ret.bettingStartTime,
      betting_end_time: ret.bettingEndTime,
      result_time: ret.resultTime,
      winning_color: ret.winningColor ?? null,
      created_at: ret.createdAt,
      completed_at: ret.completedAt ?? null,
    };
  },
});

export const ColorRound = model("ColorRound", colorRoundSchema);
