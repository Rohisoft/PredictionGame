import mongoose from "mongoose";
import { TeenPattiBet } from "../models/TeenPattiBet.js";
import { HAND_TYPES, type HandType } from "../utils/teenPattiEvaluator.js";

export function getMyTeenPattiBetForRound(userId: string, roundId: string) {
  return TeenPattiBet.findOne({ userId, roundId });
}

export function getMyTeenPattiBetHistory(userId: string, limit = 50) {
  return TeenPattiBet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber cards winningHandType status completedAt");
}

// Same "how many players / how many points per outcome" stats as
// betService.getRoundBetStats() / colorBetService.getColorRoundBetStats(),
// for Teen Patti's 6 hand-type outcomes instead.
export async function getTeenPattiRoundBetStats(roundId: string) {
  const stats = Object.fromEntries(HAND_TYPES.map((handType) => [handType, { count: 0, total: 0 }])) as Record<
    HandType,
    { count: number; total: number }
  >;

  const rows = await TeenPattiBet.aggregate([
    { $match: { roundId: new mongoose.Types.ObjectId(roundId) } },
    { $group: { _id: "$selectedHandType", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);

  for (const row of rows) {
    if (HAND_TYPES.includes(row._id)) {
      stats[row._id as HandType] = { count: row.count, total: row.total };
    }
  }

  return stats;
}
