import { Bet } from "../models/Bet.js";

export function getMyBetForRound(userId: string, roundId: string) {
  return Bet.findOne({ userId, roundId });
}

export function getMyBetHistory(userId: string, limit = 50) {
  return Bet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber diceResult winningSide status completedAt");
}
