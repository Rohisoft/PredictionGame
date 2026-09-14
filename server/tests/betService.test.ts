import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { Bet } from "../src/models/Bet.js";
import { GameRound } from "../src/models/GameRound.js";
import { getRoundBetStats } from "../src/services/betService.js";

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

describe("getRoundBetStats", () => {
  it("returns zero counts/totals for a round nobody has bet on", async () => {
    const round = await GameRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes() });
    const stats = await getRoundBetStats(round._id.toString());
    expect(stats).toEqual({ odd: { count: 0, total: 0 }, even: { count: 0, total: 0 } });
  });

  it("aggregates player count and total points per side", async () => {
    const round = await GameRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes() });
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);

    await Bet.create({ userId: a._id, roundId: round._id, selectedSide: "odd", amount: 20, status: "pending" });
    await Bet.create({ userId: b._id, roundId: round._id, selectedSide: "odd", amount: 50, status: "pending" });
    await Bet.create({ userId: c._id, roundId: round._id, selectedSide: "even", amount: 10, status: "pending" });

    const stats = await getRoundBetStats(round._id.toString());
    expect(stats.odd).toEqual({ count: 2, total: 70 });
    expect(stats.even).toEqual({ count: 1, total: 10 });
  });

  it("only counts bets on the requested round, not other rounds", async () => {
    const roundA = await GameRound.create({ roundNumber: 3, status: "betting", ...makeRoundTimes() });
    const roundB = await GameRound.create({ roundNumber: 4, status: "betting", ...makeRoundTimes() });
    const user = await makeUser();

    await Bet.create({ userId: user._id, roundId: roundA._id, selectedSide: "odd", amount: 20, status: "pending" });
    await Bet.create({ userId: user._id, roundId: roundB._id, selectedSide: "even", amount: 30, status: "pending" });

    const statsA = await getRoundBetStats(roundA._id.toString());
    expect(statsA.odd).toEqual({ count: 1, total: 20 });
    expect(statsA.even).toEqual({ count: 0, total: 0 });
  });
});
