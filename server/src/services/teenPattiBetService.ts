import { TeenPattiBet } from "../models/TeenPattiBet.js";

export function getMyTeenPattiBetForRound(userId: string, roundId: string) {
  return TeenPattiBet.findOne({ userId, roundId });
}

export function getMyTeenPattiBetHistory(userId: string, limit = 50) {
  return TeenPattiBet.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("roundId", "roundNumber cards winningHandType status completedAt");
}
