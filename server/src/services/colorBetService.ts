import mongoose from "mongoose";
import { ColorBet } from "../models/ColorBet.js";
import { COLORS } from "../models/ColorRound.js";

export function getMyColorBetForRound(userId: string, roundId: string) {
  return ColorBet.findOne({ userId, roundId });
}

export function getMyColorBetHistory(userId: string, limit = 50) {
  return ColorBet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber winningColor status completedAt");
}

// Same "how many players / how many points per outcome" stats as
// betService.getRoundBetStats(), for the color game's outcomes instead.
export async function getColorRoundBetStats(roundId: string) {
  const stats = Object.fromEntries(COLORS.map((color) => [color, { count: 0, total: 0 }])) as Record<
    (typeof COLORS)[number],
    { count: number; total: number }
  >;

  const rows = await ColorBet.aggregate([
    { $match: { roundId: new mongoose.Types.ObjectId(roundId) } },
    { $group: { _id: "$selectedColor", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);

  for (const row of rows) {
    if (COLORS.includes(row._id)) {
      stats[row._id as (typeof COLORS)[number]] = { count: row.count, total: row.total };
    }
  }

  return stats;
}
