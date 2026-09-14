import { ColorBet } from "../models/ColorBet.js";

export function getMyColorBetForRound(userId: string, roundId: string) {
  return ColorBet.findOne({ userId, roundId });
}

export function getMyColorBetHistory(userId: string, limit = 50) {
  return ColorBet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber winningColor status completedAt");
}
