import mongoose from "mongoose";
import { Bet } from "../models/Bet.js";
import { SIDES } from "../models/GameRound.js";

export function getMyBetForRound(userId: string, roundId: string) {
  return Bet.findOne({ userId, roundId });
}

export function getMyBetHistory(userId: string, limit = 50) {
  return Bet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber diceResult winningSide status completedAt");
}

// ---------------------------------------------------------------------------
// getRoundBetStats(): how many players bet on each side, and how many
// points total — shown live on the game screen. Safe to expose even during
// an open betting window: settleRound() generates the dice result with no
// way to see or react to these totals, so revealing them to players doesn't
// compromise fairness, only transparency.
// ---------------------------------------------------------------------------

export async function getRoundBetStats(roundId: string) {
  const stats = { odd: { count: 0, total: 0 }, even: { count: 0, total: 0 } };

  const rows = await Bet.aggregate([
    { $match: { roundId: new mongoose.Types.ObjectId(roundId) } },
    { $group: { _id: "$selectedSide", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);

  for (const row of rows) {
    if (SIDES.includes(row._id)) {
      stats[row._id as (typeof SIDES)[number]] = { count: row.count, total: row.total };
    }
  }

  return stats;
}
