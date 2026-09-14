import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { ColorBet } from "../src/models/ColorBet.js";
import { ColorRound, COLORS } from "../src/models/ColorRound.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../src/models/GameSettings.js";
import { COLOR_PAYOUT_MULTIPLIER } from "../src/config/constants.js";
import {
  isColorGameEnabled,
  placeColorBet,
  settleColorRound,
  setColorGameEnabled,
  tickColorRounds,
} from "../src/services/colorGameService.js";

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

describe("placeColorBet", () => {
  it("rejects a stake amount outside 10/20/50/100", async () => {
    const { user } = await makeUserWithWallet();
    const round = await ColorRound.create({ roundNumber: 1, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeColorBet(user._id.toString(), round._id.toString(), "red", 15)).rejects.toThrow(
      /Stake must be one of/,
    );
  });

  it("debits the wallet and creates a pending bet on success", async () => {
    const { user, wallet } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 2, status: "betting", ...makeRoundTimes(50_000) });

    const bet = await placeColorBet(user._id.toString(), round._id.toString(), "green", 20);
    expect(bet?.status).toBe("pending");

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.balance).toBe(80);
  });

  it("rejects a second bet on the same round", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 3, status: "betting", ...makeRoundTimes(50_000) });

    await placeColorBet(user._id.toString(), round._id.toString(), "red", 20);
    await expect(placeColorBet(user._id.toString(), round._id.toString(), "green", 10)).rejects.toThrow(
      /already made a prediction/,
    );
  });

  it("rejects betting after the deadline", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 4, status: "betting", ...makeRoundTimes(-1_000) });

    await expect(placeColorBet(user._id.toString(), round._id.toString(), "red", 10)).rejects.toThrow(
      /Predictions are closed/,
    );
  });

  it("rejects a stake the wallet cannot cover", async () => {
    const { user } = await makeUserWithWallet(5);
    const round = await ColorRound.create({ roundNumber: 5, status: "betting", ...makeRoundTimes(50_000) });

    await expect(placeColorBet(user._id.toString(), round._id.toString(), "red", 10)).rejects.toThrow(
      /Insufficient balance/,
    );
  });

  it("rejects placing a bet while the game is disabled", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 6, status: "betting", ...makeRoundTimes(50_000) });

    await setColorGameEnabled(false);
    await expect(placeColorBet(user._id.toString(), round._id.toString(), "red", 10)).rejects.toThrow(
      /currently disabled/,
    );
    await setColorGameEnabled(true);
  });
});

describe("settleColorRound", () => {
  it("pays the winning color 2x stake and leaves the losing color at zero", async () => {
    const { user: userA, wallet: walletA } = await makeUserWithWallet(100);
    const { user: userB, wallet: walletB } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 7, status: "betting", ...makeRoundTimes(-1_000) });

    const bets = {
      red: await ColorBet.create({ userId: userA._id, roundId: round._id, selectedColor: "red", amount: 50, status: "pending" }),
      green: await ColorBet.create({ userId: userB._id, roundId: round._id, selectedColor: "green", amount: 50, status: "pending" }),
    };

    await settleColorRound(round._id.toString());

    const settledRound = await ColorRound.findById(round._id);
    expect(settledRound?.status).toBe("completed");
    expect(COLORS).toContain(settledRound?.winningColor);

    const winningColor = settledRound!.winningColor!;
    const wallets = { red: walletA, green: walletB };

    for (const color of COLORS) {
      const refreshedBet = await ColorBet.findById(bets[color]._id);
      const refreshedWallet = await Wallet.findById(wallets[color]._id);
      if (color === winningColor) {
        expect(refreshedBet?.status).toBe("won");
        expect(refreshedBet?.payoutAmount).toBe(50 * COLOR_PAYOUT_MULTIPLIER);
        expect(refreshedWallet?.balance).toBe(100 + 50 * COLOR_PAYOUT_MULTIPLIER);
      } else {
        expect(refreshedBet?.status).toBe("lost");
        expect(refreshedBet?.payoutAmount).toBe(0);
        expect(refreshedWallet?.balance).toBe(100);
      }
    }
  });

  it("is idempotent — settling an already-completed round twice does not double-pay", async () => {
    const { user } = await makeUserWithWallet(100);
    const round = await ColorRound.create({ roundNumber: 8, status: "betting", ...makeRoundTimes(-1_000) });
    await ColorBet.create({ userId: user._id, roundId: round._id, selectedColor: "red", amount: 50, status: "pending" });

    await settleColorRound(round._id.toString());
    await settleColorRound(round._id.toString());

    const payoutTransactions = await WalletTransaction.countDocuments({ transactionType: "payout" });
    expect(payoutTransactions).toBeLessThanOrEqual(1);
  });

  it("rejects settling before the betting deadline has passed", async () => {
    const round = await ColorRound.create({ roundNumber: 9, status: "betting", ...makeRoundTimes(50_000) });
    await expect(settleColorRound(round._id.toString())).rejects.toThrow(/deadline has not passed/);
  });
});

describe("Color Prediction on/off switch", () => {
  it("defaults to enabled when no settings document exists yet", async () => {
    expect(await isColorGameEnabled()).toBe(true);
  });

  it("tickColorRounds still settles a due round while disabled, but does not open a new one", async () => {
    await GameSettings.findByIdAndUpdate(GAME_SETTINGS_ID, { isColorGameEnabled: false }, { upsert: true });
    const round = await ColorRound.create({ roundNumber: 10, status: "betting", ...makeRoundTimes(-1_000) });

    await tickColorRounds();

    const settled = await ColorRound.findById(round._id);
    expect(settled?.status).toBe("completed");

    const openRounds = await ColorRound.countDocuments({ status: "betting" });
    expect(openRounds).toBe(0);

    await setColorGameEnabled(true);
  });
});
