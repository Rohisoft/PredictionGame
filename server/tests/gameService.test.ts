import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { Bet } from "../src/models/Bet.js";
import { GameRound } from "../src/models/GameRound.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import { placeBet, settleRound } from "../src/services/gameService.js";

async function makeUserWithWallet(balance = 100) {
  const username = `user${new mongoose.Types.ObjectId().toString()}`;
  const user = await User.create({ username, passwordHash: "x" });
  const wallet = await Wallet.create({ userId: user._id, balance });
  return { user, wallet };
}

function makeRoundTimes(bettingEndsInMs: number) {
  const start = new Date(Date.now() - 60_000 + bettingEndsInMs);
  return {
    bettingStartTime: start,
    bettingEndTime: new Date(Date.now() + bettingEndsInMs),
    resultTime: new Date(Date.now() + bettingEndsInMs + 10_000),
  };
}

describe("placeBet", () => {
  it("rejects a stake amount outside 10/20/50/100", async () => {
    const { user } = await makeUserWithWallet();
    const round = await GameRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeBet(user._id.toString(), round._id.toString(), "odd", 15)).rejects.toThrow(
      /Stake must be one of/,
    );
  });

  it("debits the wallet and creates a pending bet on success", async () => {
    const { user, wallet } = await makeUserWithWallet(100);
    const round = await GameRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes(50_000) });

    const bet = await placeBet(user._id.toString(), round._id.toString(), "odd", 20);
    expect(bet?.status).toBe("pending");

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.balance).toBe(80);
  });

  it("rejects a second bet on the same round", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await GameRound.create({ roundNumber: 3, status: "betting", ...makeRoundTimes(50_000) });

    await placeBet(user._id.toString(), round._id.toString(), "odd", 20);
    await expect(placeBet(user._id.toString(), round._id.toString(), "even", 10)).rejects.toThrow(
      /already made a prediction/,
    );
  });

  it("rejects betting after the deadline", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await GameRound.create({ roundNumber: 4, status: "betting", ...makeRoundTimes(-1_000) });

    await expect(placeBet(user._id.toString(), round._id.toString(), "odd", 10)).rejects.toThrow(
      /Predictions are closed/,
    );
  });

  it("rejects a stake the wallet cannot cover", async () => {
    const { user } = await makeUserWithWallet(5);
    const round = await GameRound.create({ roundNumber: 5, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeBet(user._id.toString(), round._id.toString(), "odd", 10)).rejects.toThrow(
      /Insufficient balance/,
    );
  });
});

describe("settleRound", () => {
  it("pays the winning side 2x stake and leaves the losing side at zero", async () => {
    const { user: winner, wallet: winnerWallet } = await makeUserWithWallet(100);
    const { user: loser, wallet: loserWallet } = await makeUserWithWallet(100);
    const round = await GameRound.create({ roundNumber: 6, status: "betting", ...makeRoundTimes(-1_000) });

    const winnerBet = await Bet.create({ userId: winner._id, roundId: round._id, selectedSide: "odd", amount: 50, status: "pending" });
    const loserBet = await Bet.create({ userId: loser._id, roundId: round._id, selectedSide: "even", amount: 50, status: "pending" });

    await settleRound(round._id.toString());

    const settledRound = await GameRound.findById(round._id);
    expect(settledRound?.status).toBe("completed");
    expect(settledRound?.diceResult).toBeGreaterThanOrEqual(1);
    expect(settledRound?.diceResult).toBeLessThanOrEqual(6);

    const winningBet = settledRound?.winningSide === "odd" ? winnerBet : loserBet;
    const losingBet = settledRound?.winningSide === "odd" ? loserBet : winnerBet;
    const winningWallet = settledRound?.winningSide === "odd" ? winnerWallet : loserWallet;

    const refreshedWinningBet = await Bet.findById(winningBet._id);
    const refreshedLosingBet = await Bet.findById(losingBet._id);
    expect(refreshedWinningBet?.status).toBe("won");
    expect(refreshedWinningBet?.payoutAmount).toBe(100);
    expect(refreshedLosingBet?.status).toBe("lost");
    expect(refreshedLosingBet?.payoutAmount).toBe(0);

    const refreshedWinningWallet = await Wallet.findById(winningWallet._id);
    expect(refreshedWinningWallet?.balance).toBe(200); // 100 - 50 stake would already be reflected if placed via placeBet; here we seeded balance directly, so payout just adds 100
  });

  it("is idempotent — settling an already-completed round twice does not double-pay", async () => {
    const { user, wallet } = await makeUserWithWallet(100);
    const round = await GameRound.create({ roundNumber: 7, status: "betting", ...makeRoundTimes(-1_000) });
    await Bet.create({ userId: user._id, roundId: round._id, selectedSide: "odd", amount: 50, status: "pending" });

    await settleRound(round._id.toString());
    await settleRound(round._id.toString());

    const payoutTransactions = await WalletTransaction.countDocuments({ transactionType: "payout" });
    expect(payoutTransactions).toBeLessThanOrEqual(1);
    void wallet;
  });

  it("rejects settling before the betting deadline has passed", async () => {
    const round = await GameRound.create({ roundNumber: 8, status: "betting", ...makeRoundTimes(50_000) });
    await expect(settleRound(round._id.toString())).rejects.toThrow(/deadline has not passed/);
  });
});
