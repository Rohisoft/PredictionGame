import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { TeenPattiBet } from "../src/models/TeenPattiBet.js";
import { TeenPattiRound } from "../src/models/TeenPattiRound.js";
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
  it("returns zero counts/totals for both players when nobody has bet", async () => {
    const round = await TeenPattiRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes() });
    const stats = await getTeenPattiRoundBetStats(round._id.toString());
    expect(stats).toEqual({ playerA: { count: 0, total: 0 }, playerB: { count: 0, total: 0 } });
  });

  it("aggregates player count and total points per side", async () => {
    const round = await TeenPattiRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes() });
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);

    await TeenPattiBet.create({ userId: a._id, roundId: round._id, selectedPlayer: "playerA", amount: 20, status: "pending" });
    await TeenPattiBet.create({ userId: b._id, roundId: round._id, selectedPlayer: "playerA", amount: 50, status: "pending" });
    await TeenPattiBet.create({ userId: c._id, roundId: round._id, selectedPlayer: "playerB", amount: 10, status: "pending" });

    const stats = await getTeenPattiRoundBetStats(round._id.toString());
    expect(stats.playerA).toEqual({ count: 2, total: 70 });
    expect(stats.playerB).toEqual({ count: 1, total: 10 });
  });
});
