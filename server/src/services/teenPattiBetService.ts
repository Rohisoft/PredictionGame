import mongoose from "mongoose";
import { TeenPattiBet, TEEN_PATTI_PLAYERS, type TeenPattiPlayer } from "../models/TeenPattiBet.js";

export function getMyTeenPattiBetForRound(userId: string, roundId: string) {
  return TeenPattiBet.findOne({ userId, roundId });
}

export function getMyTeenPattiBetHistory(userId: string, limit = 50) {
  return TeenPattiBet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(
      "roundId",
      "roundNumber playerACards playerBCards playerAHandType playerBHandType winner status completedAt",
    );
}

// Same "how many players / how many points per outcome" stats as
// betService.getRoundBetStats() / colorBetService.getColorRoundBetStats(),
// for Teen Patti's Player A / Player B outcomes instead.
export async function getTeenPattiRoundBetStats(roundId: string) {
  const stats = Object.fromEntries(TEEN_PATTI_PLAYERS.map((player) => [player, { count: 0, total: 0 }])) as Record<
    TeenPattiPlayer,
    { count: number; total: number }
  >;

  const rows = await TeenPattiBet.aggregate([
    { $match: { roundId: new mongoose.Types.ObjectId(roundId) } },
    { $group: { _id: "$selectedPlayer", count: { $sum: 1 }, total: { $sum: "$amount" } } },
  ]);

  for (const row of rows) {
    if (TEEN_PATTI_PLAYERS.includes(row._id)) {
      stats[row._id as TeenPattiPlayer] = { count: row.count, total: row.total };
    }
  }

  return stats;
}
