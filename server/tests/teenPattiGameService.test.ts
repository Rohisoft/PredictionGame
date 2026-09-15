import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { TeenPattiBet } from "../src/models/TeenPattiBet.js";
import { TeenPattiRound } from "../src/models/TeenPattiRound.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../src/models/GameSettings.js";
import { HAND_TYPES } from "../src/utils/teenPattiEvaluator.js";
import { TEEN_PATTI_MULTIPLIERS } from "../src/config/constants.js";
import {
  isTeenPattiEnabled,
  placeTeenPattiBet,
  settleTeenPattiRound,
  setTeenPattiEnabled,
  tickTeenPattiRounds,
} from "../src/services/teenPattiGameService.js";

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

describe("placeTeenPattiBet", () => {
  it("rejects a stake amount outside 10/20/50/100", async () => {
    const { user } = await makeUserWithWallet();
    const round = await TeenPattiRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeTeenPattiBet(user._id.toString(), round._id.toString(), "pair", 15)).rejects.toThrow(
      /Stake must be one of/,
    );
  });

  it("debits the wallet and creates a pending bet on success", async () => {
    const { user, wallet } = await makeUserWithWallet(100);
    const round = await TeenPattiRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes(50_000) });

    const bet = await placeTeenPattiBet(user._id.toString(), round._id.toString(), "highCard", 20);
    expect(bet?.status).toBe("pending");

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.balance).toBe(80);
  });

  it("rejects a second bet on the same round", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await TeenPattiRound.create({ roundNumber: 3, status: "betting", ...makeRoundTimes(50_000) });

    await placeTeenPattiBet(user._id.toString(), round._id.toString(), "pair", 20);
    await expect(placeTeenPattiBet(user._id.toString(), round._id.toString(), "color", 10)).rejects.toThrow(
      /already made a prediction/,
    );
  });

  it("rejects betting after the deadline", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await TeenPattiRound.create({ roundNumber: 4, status: "betting", ...makeRoundTimes(-1_000) });

    await expect(placeTeenPattiBet(user._id.toString(), round._id.toString(), "pair", 10)).rejects.toThrow(
      /Predictions are closed/,
    );
  });

  it("rejects a stake the wallet cannot cover", async () => {
    const { user } = await makeUserWithWallet(5);
    const round = await TeenPattiRound.create({ roundNumber: 5, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeTeenPattiBet(user._id.toString(), round._id.toString(), "pair", 10)).rejects.toThrow(
      /Insufficient balance/,
    );
  });

  it("rejects placing a bet while the game is disabled", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await TeenPattiRound.create({ roundNumber: 6, status: "betting", ...makeRoundTimes(50_000) });

    await setTeenPattiEnabled(false);
    await expect(placeTeenPattiBet(user._id.toString(), round._id.toString(), "pair", 10)).rejects.toThrow(
      /currently disabled/,
    );
    await setTeenPattiEnabled(true);
  });
});

describe("settleTeenPattiRound", () => {
  it("pays exactly the bet(s) matching the dealt hand type its fair multiplier, and nothing to the rest", async () => {
    // Bet every one of the 6 hand types on the same round — whichever hand
    // actually gets dealt, exactly one of these bets must win.
    const round = await TeenPattiRound.create({ roundNumber: 7, status: "betting", ...makeRoundTimes(-1_000) });
    const entries = await Promise.all(
      HAND_TYPES.map(async (handType) => {
        const { user, wallet } = await makeUserWithWallet(100);
        const bet = await TeenPattiBet.create({
          userId: user._id,
          roundId: round._id,
          selectedHandType: handType,
          amount: 50,
          status: "pending",
        });
        return { handType, user, wallet, bet };
      }),
    );

    await settleTeenPattiRound(round._id.toString());

    const settledRound = await TeenPattiRound.findById(round._id);
    expect(settledRound?.status).toBe("completed");
    expect(settledRound?.cards).toHaveLength(3);
    expect(HAND_TYPES).toContain(settledRound?.winningHandType);

    const winningHandType = settledRound!.winningHandType!;
    let winners = 0;

    for (const entry of entries) {
      const refreshedBet = await TeenPattiBet.findById(entry.bet._id);
      const refreshedWallet = await Wallet.findById(entry.wallet._id);

      if (entry.handType === winningHandType) {
        winners++;
        const expectedPayout = 50 * TEEN_PATTI_MULTIPLIERS[winningHandType];
        expect(refreshedBet?.status).toBe("won");
        expect(refreshedBet?.payoutAmount).toBe(expectedPayout);
        expect(refreshedWallet?.balance).toBe(100 + expectedPayout);
      } else {
        expect(refreshedBet?.status).toBe("lost");
        expect(refreshedBet?.payoutAmount).toBe(0);
        expect(refreshedWallet?.balance).toBe(100);
      }
    }

    expect(winners).toBe(1);
  });

  it("is idempotent — settling an already-completed round twice does not double-pay", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await TeenPattiRound.create({ roundNumber: 8, status: "betting", ...makeRoundTimes(-1_000) });
    await TeenPattiBet.create({
      userId: user._id,
      roundId: round._id,
      selectedHandType: "highCard",
      amount: 50,
      status: "pending",
    });

    await settleTeenPattiRound(round._id.toString());
    await settleTeenPattiRound(round._id.toString());

    const payoutTransactions = await WalletTransaction.countDocuments({ transactionType: "payout" });
    expect(payoutTransactions).toBeLessThanOrEqual(1);
  });

  it("rejects settling before the betting deadline has passed", async () => {
    const round = await TeenPattiRound.create({ roundNumber: 9, status: "betting", ...makeRoundTimes(50_000) });
    await expect(settleTeenPattiRound(round._id.toString())).rejects.toThrow(/deadline has not passed/);
  });
});

describe("Teen Patti Prediction on/off switch", () => {
  it("defaults to enabled when no settings document exists yet", async () => {
    expect(await isTeenPattiEnabled()).toBe(true);
  });

  it("tickTeenPattiRounds still settles a due round while disabled, but does not open a new one", async () => {
    await GameSettings.findByIdAndUpdate(GAME_SETTINGS_ID, { isTeenPattiEnabled: false }, { upsert: true });
    const round = await TeenPattiRound.create({ roundNumber: 10, status: "betting", ...makeRoundTimes(-1_000) });

    await tickTeenPattiRounds();

    const settled = await TeenPattiRound.findById(round._id);
    expect(settled?.status).toBe("completed");

    const openRounds = await TeenPattiRound.countDocuments({ status: "betting" });
    expect(openRounds).toBe(0);

    await setTeenPattiEnabled(true);
  });
});
