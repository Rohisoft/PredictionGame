import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { TeenPattiBet } from "../src/models/TeenPattiBet.js";
import { TeenPattiRound } from "../src/models/TeenPattiRound.js";
import { HAND_TYPES } from "../src/utils/teenPattiEvaluator.js";
import { getTeenPattiRoundBetStats } from "../src/services/teenPattiBetService.js";

async function makeUser() {
  const username = `user${new mongoose.Types.ObjectId().toString()}`;
  const user = await User.create({ username, passwordHash: "x" });
  await Wallet.create({ userId: user._id, balance: 100 });
  return user;
}

function makeRoundTimes() {
  const start = new Date();
  return {
    bettingStartTime: start,
    bettingEndTime: new Date(start.getTime() + 50_000),
    resultTime: new Date(start.getTime() + 60_000),
  };
}

describe("getTeenPattiRoundBetStats", () => {
  it("returns zero counts/totals for all 6 hand types when nobody has bet", async () => {
    const round = await TeenPattiRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes() });
    const stats = await getTeenPattiRoundBetStats(round._id.toString());

    expect(Object.keys(stats).sort()).toEqual([...HAND_TYPES].sort());
    for (const handType of HAND_TYPES) {
      expect(stats[handType]).toEqual({ count: 0, total: 0 });
    }
  });

  it("aggregates player count and total points per hand type", async () => {
    const round = await TeenPattiRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes() });
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);

    await TeenPattiBet.create({ userId: a._id, roundId: round._id, selectedHandType: "highCard", amount: 20, status: "pending" });
    await TeenPattiBet.create({ userId: b._id, roundId: round._id, selectedHandType: "highCard", amount: 50, status: "pending" });
    await TeenPattiBet.create({ userId: c._id, roundId: round._id, selectedHandType: "trail", amount: 10, status: "pending" });

    const stats = await getTeenPattiRoundBetStats(round._id.toString());
    expect(stats.highCard).toEqual({ count: 2, total: 70 });
    expect(stats.trail).toEqual({ count: 1, total: 10 });
    expect(stats.pair).toEqual({ count: 0, total: 0 });
  });
});
