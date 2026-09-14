import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { ColorBet } from "../src/models/ColorBet.js";
import { ColorRound } from "../src/models/ColorRound.js";
import { getColorRoundBetStats } from "../src/services/colorBetService.js";

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

describe("getColorRoundBetStats", () => {
  it("returns zero counts/totals for a round nobody has bet on", async () => {
    const round = await ColorRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes() });
    const stats = await getColorRoundBetStats(round._id.toString());
    expect(stats).toEqual({ red: { count: 0, total: 0 }, green: { count: 0, total: 0 } });
  });

  it("aggregates player count and total points per color", async () => {
    const round = await ColorRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes() });
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);

    await ColorBet.create({ userId: a._id, roundId: round._id, selectedColor: "red", amount: 20, status: "pending" });
    await ColorBet.create({ userId: b._id, roundId: round._id, selectedColor: "red", amount: 50, status: "pending" });
    await ColorBet.create({ userId: c._id, roundId: round._id, selectedColor: "green", amount: 10, status: "pending" });

    const stats = await getColorRoundBetStats(round._id.toString());
    expect(stats.red).toEqual({ count: 2, total: 70 });
    expect(stats.green).toEqual({ count: 1, total: 10 });
  });
});
