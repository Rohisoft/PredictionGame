import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { GameRound, type Side } from "../models/GameRound.js";
import { Bet } from "../models/Bet.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";
import { BETTING_DURATION_SECONDS, PAYOUT_MULTIPLIER, ROUND_DURATION_SECONDS, STAKE_AMOUNTS } from "../config/constants.js";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getCurrentRound() {
  return GameRound.findOne().sort({ roundNumber: -1 });
}

export function getRoundById(roundId: string) {
  return GameRound.findById(roundId);
}

export function getRecentRounds(limit = 20) {
  return GameRound.find({ status: "completed" }).sort({ roundNumber: -1 }).limit(limit);
}

// ---------------------------------------------------------------------------
// placeBet(): the only way a bet can be created. Mirrors the Postgres
// `place_bet` function — validates stake amount, round phase, and balance,
// then debits the wallet and inserts the bet atomically inside a MongoDB
// transaction (requires a replica set, e.g. Atlas).
// ---------------------------------------------------------------------------

export async function placeBet(userId: string, roundId: string, selectedSide: Side, amount: number) {
  if (!STAKE_AMOUNTS.includes(amount as (typeof STAKE_AMOUNTS)[number])) {
    throw new HttpError(400, `Stake must be one of ${STAKE_AMOUNTS.join(", ")}`);
  }

  const session = await mongoose.startSession();
  try {
    let createdBet;

    await session.withTransaction(async () => {
      const round = await GameRound.findById(roundId).session(session);
      if (!round) throw new HttpError(404, "Round not found");

      if (round.status !== "betting" || Date.now() >= round.bettingEndTime.getTime()) {
        throw new HttpError(400, "Betting is closed for this round");
      }

      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) throw new HttpError(404, "Wallet not found");

      if (wallet.balance < amount) {
        throw new HttpError(400, "Insufficient balance");
      }

      try {
        [createdBet] = await Bet.create(
          [{ userId, roundId, selectedSide, amount, status: "pending" }],
          { session },
        );
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
          throw new HttpError(409, "You have already placed a bet on this round");
        }
        throw err;
      }

      // Atomic, condition-guarded debit — the $gte guard is a second line of
      // defense against a negative balance even though the transaction's
      // snapshot isolation already prevents a concurrent double-spend.
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
            description: `Bet on round #${round.roundNumber}`,
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
// settleRound(): generates the dice result exactly once and settles every
// pending bet. Idempotent. Not exposed over HTTP — only called by the
// round scheduler (see jobs/roundScheduler.ts).
// ---------------------------------------------------------------------------

export async function settleRound(roundId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const round = await GameRound.findById(roundId).session(session);
      if (!round) throw new Error("Round not found");

      // Idempotency guard: once completed, never touch it again.
      if (round.status === "completed") return;

      if (Date.now() < round.bettingEndTime.getTime()) {
        throw new Error("Betting deadline has not passed yet");
      }

      // Cryptographically secure randomness (Node's CSPRNG-backed
      // crypto.randomInt), generated once, here, after betting has closed —
      // never derived from bet totals on either side.
      const diceResult = randomInt(1, 7); // 1..6 inclusive
      const winningSide: Side = diceResult % 2 === 0 ? "even" : "odd";

      round.status = "completed";
      round.diceResult = diceResult;
      round.winningSide = winningSide;
      round.completedAt = new Date();
      await round.save({ session });

      const pendingBets = await Bet.find({ roundId: round._id, status: "pending" }).session(session);

      for (const bet of pendingBets) {
        if (bet.selectedSide === winningSide) {
          const payout = bet.amount * PAYOUT_MULTIPLIER;

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
                description: `Payout for round #${round.roundNumber}`,
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
// createNextRound(): opens a fresh round starting now.
// ---------------------------------------------------------------------------

export async function createNextRound() {
  const last = await GameRound.findOne().sort({ roundNumber: -1 });
  const nextNumber = (last?.roundNumber ?? 0) + 1;

  const start = new Date();
  const bettingEndTime = new Date(start.getTime() + BETTING_DURATION_SECONDS * 1000);
  const resultTime = new Date(start.getTime() + ROUND_DURATION_SECONDS * 1000);

  await GameRound.create({
    roundNumber: nextNumber,
    status: "betting",
    bettingStartTime: start,
    bettingEndTime,
    resultTime,
  });
}

// ---------------------------------------------------------------------------
// tickRounds(): the scheduler's single entry point, run every minute (see
// jobs/roundScheduler.ts). Settles whatever round just ended, then makes
// sure a new betting round is open.
// ---------------------------------------------------------------------------

export async function tickRounds() {
  const now = new Date();

  const dueRounds = await GameRound.find({ status: "betting", bettingEndTime: { $lte: now } });
  for (const round of dueRounds) {
    await settleRound(round._id.toString());
  }

  const hasOpenRound = await GameRound.exists({ status: "betting", bettingEndTime: { $gt: now } });
  if (!hasOpenRound) {
    await createNextRound();
  }
}
