import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { GameRound, type Side } from "../models/GameRound.js";
import { Bet } from "../models/Bet.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../models/GameSettings.js";
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
// Game on/off switch. Lazily created on first read so a brand-new deployment
// defaults to "running" (the previous, always-on behaviour) without needing
// a migration.
// ---------------------------------------------------------------------------

export async function isGameRunning() {
  const settings = await GameSettings.findById(GAME_SETTINGS_ID);
  return settings?.isGameRunning ?? true;
}

async function setGameRunning(running: boolean) {
  await GameSettings.findByIdAndUpdate(
    GAME_SETTINGS_ID,
    { isGameRunning: running },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

export async function getGameState() {
  const [running, currentRound] = await Promise.all([isGameRunning(), getCurrentRound()]);
  return { isGameRunning: running, currentRound };
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
        throw new HttpError(400, "Predictions are closed for this round");
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
          throw new HttpError(409, "You've already made a prediction for this round");
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
// cancelRound(): admin-triggered early stop. Unlike settleRound(), no dice
// result is ever generated — every pending bet is refunded in full instead
// of won/lost, since the round never ran its course. Idempotent.
// ---------------------------------------------------------------------------

export async function cancelRound(roundId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const round = await GameRound.findById(roundId).session(session);
      if (!round) throw new Error("Round not found");

      // Idempotency guard, same spirit as settleRound()'s.
      if (round.status !== "betting") return;

      round.status = "cancelled";
      round.completedAt = new Date();
      await round.save({ session });

      const pendingBets = await Bet.find({ roundId: round._id, status: "pending" }).session(session);

      for (const bet of pendingBets) {
        const wallet = await Wallet.findOne({ userId: bet.userId }).session(session);
        if (!wallet) throw new Error(`Wallet not found for user ${bet.userId}`);

        const updatedWallet = await Wallet.findOneAndUpdate(
          { _id: wallet._id },
          { $inc: { balance: bet.amount } },
          { session, new: true },
        );

        await WalletTransaction.create(
          [
            {
              userId: bet.userId,
              walletId: wallet._id,
              transactionType: "refund",
              amount: bet.amount,
              balanceBefore: wallet.balance,
              balanceAfter: updatedWallet!.balance,
              referenceId: bet._id,
              description: `Refund for cancelled round #${round.roundNumber}`,
            },
          ],
          { session },
        );

        bet.status = "refunded";
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
// jobs/roundScheduler.ts). Settles whatever round just ended — always, so
// bets already placed are never left unresolved — then opens a new betting
// round only if an admin currently has the game switched on.
// ---------------------------------------------------------------------------

export async function tickRounds() {
  const now = new Date();

  const dueRounds = await GameRound.find({ status: "betting", bettingEndTime: { $lte: now } });
  for (const round of dueRounds) {
    await settleRound(round._id.toString());
  }

  if (!(await isGameRunning())) return;

  const hasOpenRound = await GameRound.exists({ status: "betting", bettingEndTime: { $gt: now } });
  if (!hasOpenRound) {
    await createNextRound();
  }
}

// ---------------------------------------------------------------------------
// Admin manual controls. "Start" switches the game on and immediately opens
// a round if none is open; "stop" switches it off and cancels (refunds) any
// round currently taking predictions, rather than leaving it to resolve on
// its own with no admin watching.
// ---------------------------------------------------------------------------

export async function adminStartRound() {
  await setGameRunning(true);

  const hasOpenRound = await GameRound.exists({ status: "betting", bettingEndTime: { $gt: new Date() } });
  if (!hasOpenRound) {
    await createNextRound();
  }

  return getGameState();
}

export async function adminStopRound() {
  await setGameRunning(false);

  const openRound = await GameRound.findOne({ status: "betting" }).sort({ roundNumber: -1 });
  if (openRound) {
    await cancelRound(openRound._id.toString());
  }

  return getGameState();
}
