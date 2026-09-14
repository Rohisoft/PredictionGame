import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { ColorRound, COLORS, type Color } from "../models/ColorRound.js";
import { ColorBet } from "../models/ColorBet.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../models/GameSettings.js";
import { HttpError } from "../utils/asyncHandler.js";
import {
  BETTING_DURATION_SECONDS,
  COLOR_PAYOUT_MULTIPLIER,
  ROUND_DURATION_SECONDS,
  STAKE_AMOUNTS,
} from "../config/constants.js";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getCurrentColorRound() {
  return ColorRound.findOne().sort({ roundNumber: -1 });
}

export function getColorRoundById(roundId: string) {
  return ColorRound.findById(roundId);
}

export function getRecentColorRounds(limit = 20) {
  return ColorRound.find({ status: "completed" }).sort({ roundNumber: -1 }).limit(limit);
}

// ---------------------------------------------------------------------------
// Superadmin-only on/off switch. Lazily created on first read, defaulting to
// enabled. tickColorRounds() only opens new rounds while this is true; it
// still settles whatever round is already in flight either way, so bets
// already placed are never left unresolved.
// ---------------------------------------------------------------------------

export async function isColorGameEnabled() {
  const settings = await GameSettings.findById(GAME_SETTINGS_ID);
  return settings?.isColorGameEnabled ?? true;
}

export async function setColorGameEnabled(enabled: boolean) {
  await GameSettings.findByIdAndUpdate(
    GAME_SETTINGS_ID,
    { isColorGameEnabled: enabled },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return { enabled };
}

// ---------------------------------------------------------------------------
// placeColorBet(): mirrors gameService.placeBet() exactly, for a 3-way
// color pick instead of a 2-way odd/even pick.
// ---------------------------------------------------------------------------

export async function placeColorBet(userId: string, roundId: string, selectedColor: Color, amount: number) {
  if (!STAKE_AMOUNTS.includes(amount as (typeof STAKE_AMOUNTS)[number])) {
    throw new HttpError(400, `Stake must be one of ${STAKE_AMOUNTS.join(", ")}`);
  }
  if (!(await isColorGameEnabled())) {
    throw new HttpError(403, "Color Prediction is currently disabled");
  }

  const session = await mongoose.startSession();
  try {
    let createdBet;

    await session.withTransaction(async () => {
      const round = await ColorRound.findById(roundId).session(session);
      if (!round) throw new HttpError(404, "Round not found");

      if (round.status !== "betting" || Date.now() >= round.bettingEndTime.getTime()) {
        throw new HttpError(400, "Predictions are closed for this round");
      }

      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new HttpError(404, "Wallet not found");

      if (wallet.balance < amount) {
        throw new HttpError(400, "Insufficient balance");
      }

      try {
        [createdBet] = await ColorBet.create(
          [{ userId, roundId, selectedColor, amount, status: "pending" }],
          { session },
        );
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
          throw new HttpError(409, "You've already made a prediction for this round");
        }
        throw err;
      }

      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { session, new: true },
      );
      if (!updatedWallet) throw new HttpError(400, "Insufficient balance");

      await WalletTransaction.create(
        [
          {
            userId,
            walletId: wallet._id,
            transactionType: "bet",
            amount: -amount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            referenceId: createdBet!._id,
            description: `Color prediction on round #${round.roundNumber}`,
          },
        ],
        { session },
      );
    });

    return createdBet;
  } finally {
    await session.endSession();
  }
}

// ---------------------------------------------------------------------------
// settleColorRound(): picks the winning color exactly once and settles every
// pending bet. Idempotent. Not exposed over HTTP — only the scheduler calls
// it.
// ---------------------------------------------------------------------------

export async function settleColorRound(roundId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const round = await ColorRound.findById(roundId).session(session);
      if (!round) throw new Error("Round not found");

      if (round.status === "completed") return;

      if (Date.now() < round.bettingEndTime.getTime()) {
        throw new Error("Betting deadline has not passed yet");
      }

      // Cryptographically secure, uniform pick among the 3 colors — same
      // fairness pattern as the dice roll in gameService.settleRound().
      const winningColor: Color = COLORS[randomInt(0, COLORS.length)];

      round.status = "completed";
      round.winningColor = winningColor;
      round.completedAt = new Date();
      await round.save({ session });

      const pendingBets = await ColorBet.find({ roundId: round._id, status: "pending" }).session(session);

      for (const bet of pendingBets) {
        if (bet.selectedColor === winningColor) {
          const payout = bet.amount * COLOR_PAYOUT_MULTIPLIER;

          const wallet = await Wallet.findOne({ userId: bet.userId }).session(session);
          if (!wallet) throw new Error(`Wallet not found for winning user ${bet.userId}`);

          const updatedWallet = await Wallet.findOneAndUpdate(
            { _id: wallet._id },
            { $inc: { balance: payout } },
            { session, new: true },
          );

          await WalletTransaction.create(
            [
              {
                userId: bet.userId,
                walletId: wallet._id,
                transactionType: "payout",
                amount: payout,
                balanceBefore: wallet.balance,
                balanceAfter: updatedWallet!.balance,
                referenceId: bet._id,
                description: `Color payout for round #${round.roundNumber}`,
              },
            ],
            { session },
          );

          bet.status = "won";
          bet.payoutAmount = payout;
        } else {
          bet.status = "lost";
          bet.payoutAmount = 0;
        }
        bet.settledAt = new Date();
        await bet.save({ session });
      }
    });
  } finally {
    await session.endSession();
  }
}

// ---------------------------------------------------------------------------
// createNextColorRound(): opens a fresh round starting now.
// ---------------------------------------------------------------------------

export async function createNextColorRound() {
  const last = await ColorRound.findOne().sort({ roundNumber: -1 });
  const nextNumber = (last?.roundNumber ?? 0) + 1;

  const start = new Date();
  const bettingEndTime = new Date(start.getTime() + BETTING_DURATION_SECONDS * 1000);
  const resultTime = new Date(start.getTime() + ROUND_DURATION_SECONDS * 1000);

  await ColorRound.create({
    roundNumber: nextNumber,
    status: "betting",
    bettingStartTime: start,
    bettingEndTime,
    resultTime,
  });
}

// ---------------------------------------------------------------------------
// tickColorRounds(): the scheduler's entry point for Color Prediction, run
// alongside tickRounds() every minute. Settles whatever round just ended
// regardless of the switch, then opens a new one only while enabled.
// ---------------------------------------------------------------------------

export async function tickColorRounds() {
  const now = new Date();

  const dueRounds = await ColorRound.find({ status: "betting", bettingEndTime: { $lte: now } });
  for (const round of dueRounds) {
    await settleColorRound(round._id.toString());
  }

  if (!(await isColorGameEnabled())) return;

  const hasOpenRound = await ColorRound.exists({ status: "betting", bettingEndTime: { $gt: now } });
  if (!hasOpenRound) {
    await createNextColorRound();
  }
}
