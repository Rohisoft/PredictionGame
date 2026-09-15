import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { TeenPattiRound, type TeenPattiWinner } from "../models/TeenPattiRound.js";
import { TeenPattiBet, type TeenPattiPlayer } from "../models/TeenPattiBet.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../models/GameSettings.js";
import { HttpError } from "../utils/asyncHandler.js";
import { buildDeck, compareHands, evaluateHand, type Card } from "../utils/teenPattiEvaluator.js";
import {
  BETTING_DURATION_SECONDS,
  ROUND_DURATION_SECONDS,
  STAKE_AMOUNTS,
  TEEN_PATTI_PAYOUT_MULTIPLIER,
} from "../config/constants.js";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getCurrentTeenPattiRound() {
  return TeenPattiRound.findOne().sort({ roundNumber: -1 });
}

export function getTeenPattiRoundById(roundId: string) {
  return TeenPattiRound.findById(roundId);
}

export function getRecentTeenPattiRounds(limit = 20) {
  return TeenPattiRound.find({ status: "completed" }).sort({ roundNumber: -1 }).limit(limit);
}

// ---------------------------------------------------------------------------
// Superadmin-only on/off switch. Lazily created on first read, defaulting to
// enabled. tickTeenPattiRounds() only opens new rounds while this is true;
// it still settles whatever round is already in flight either way, so bets
// already placed are never left unresolved.
// ---------------------------------------------------------------------------

export async function isTeenPattiEnabled() {
  const settings = await GameSettings.findById(GAME_SETTINGS_ID);
  return settings?.isTeenPattiEnabled ?? true;
}

export async function setTeenPattiEnabled(enabled: boolean) {
  await GameSettings.findByIdAndUpdate(
    GAME_SETTINGS_ID,
    { isTeenPattiEnabled: enabled },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return getTeenPattiGameState();
}

export async function getTeenPattiGameState() {
  const [enabled, currentRound] = await Promise.all([isTeenPattiEnabled(), getCurrentTeenPattiRound()]);
  return { enabled, currentRound };
}

// ---------------------------------------------------------------------------
// dealTwoHands(): 6 distinct cards drawn from a full 52-card deck via a
// partial Fisher-Yates shuffle using Node's CSPRNG (crypto.randomInt) — the
// first 3 go to Player A (the user), the next 3 to Player B (the
// computer), from one shared shuffle exactly like a real Teen Patti table.
// Same fairness pattern as the dice roll / color pick: generated once,
// here, only after betting has closed, with no way for the client to
// influence or predict it.
// ---------------------------------------------------------------------------

function dealTwoHands(): { playerA: [Card, Card, Card]; playerB: [Card, Card, Card] } {
  const deck = buildDeck();
  for (let i = 0; i < 6; i++) {
    const j = i + randomInt(0, deck.length - i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    playerA: [deck[0], deck[1], deck[2]],
    playerB: [deck[3], deck[4], deck[5]],
  };
}

// ---------------------------------------------------------------------------
// placeTeenPattiBet(): mirrors gameService.placeBet() / colorGameService
// .placeColorBet() exactly, for a Player A / Player B pick instead of
// odd/even or red/green.
// ---------------------------------------------------------------------------

export async function placeTeenPattiBet(userId: string, roundId: string, selectedPlayer: TeenPattiPlayer, amount: number) {
  if (!STAKE_AMOUNTS.includes(amount as (typeof STAKE_AMOUNTS)[number])) {
    throw new HttpError(400, `Stake must be one of ${STAKE_AMOUNTS.join(", ")}`);
  }
  if (!(await isTeenPattiEnabled())) {
    throw new HttpError(403, "Teen Patti Prediction is currently disabled");
  }

  const session = await mongoose.startSession();
  try {
    let createdBet;

    await session.withTransaction(async () => {
      const round = await TeenPattiRound.findById(roundId).session(session);
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
        [createdBet] = await TeenPattiBet.create(
          [{ userId, roundId, selectedPlayer, amount, status: "pending" }],
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
            description: `Teen Patti prediction on round #${round.roundNumber}`,
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
// settleTeenPattiRound(): deals both hands exactly once, determines the
// winner, and settles every pending bet. Idempotent. Not exposed over
// HTTP — only the scheduler calls it.
//
// A tie refunds every pending bet in full rather than picking an arbitrary
// "winner" — the predefined tie rule the feature calls for. This isn't a
// loophole: paired with the flat TEEN_PATTI_PAYOUT_MULTIPLIER on real wins,
// it keeps the game exactly fair in expectation regardless of how often
// ties actually occur (see the derivation in config/constants.ts).
// ---------------------------------------------------------------------------

export async function settleTeenPattiRound(roundId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const round = await TeenPattiRound.findById(roundId).session(session);
      if (!round) throw new Error("Round not found");

      if (round.status === "completed") return;

      if (Date.now() < round.bettingEndTime.getTime()) {
        throw new Error("Betting deadline has not passed yet");
      }

      const { playerA, playerB } = dealTwoHands();
      const playerAHandType = evaluateHand(playerA);
      const playerBHandType = evaluateHand(playerB);
      const comparison = compareHands(playerA, playerB);
      const winner: TeenPattiWinner = comparison > 0 ? "playerA" : comparison < 0 ? "playerB" : "tie";

      round.status = "completed";
      round.playerACards.splice(0, round.playerACards.length, ...playerA);
      round.playerBCards.splice(0, round.playerBCards.length, ...playerB);
      round.playerAHandType = playerAHandType;
      round.playerBHandType = playerBHandType;
      round.winner = winner;
      round.completedAt = new Date();
      await round.save({ session });

      const pendingBets = await TeenPattiBet.find({ roundId: round._id, status: "pending" }).session(session);

      for (const bet of pendingBets) {
        if (winner === "tie") {
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
                description: `Refund for tied round #${round.roundNumber}`,
              },
            ],
            { session },
          );

          bet.status = "refunded";
          bet.payoutAmount = 0;
        } else if (bet.selectedPlayer === winner) {
          const payout = bet.amount * TEEN_PATTI_PAYOUT_MULTIPLIER;

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
                description: `Teen Patti payout for round #${round.roundNumber}`,
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
// createNextTeenPattiRound(): opens a fresh round starting now.
// ---------------------------------------------------------------------------

export async function createNextTeenPattiRound() {
  const last = await TeenPattiRound.findOne().sort({ roundNumber: -1 });
  const nextNumber = (last?.roundNumber ?? 0) + 1;

  const start = new Date();
  const bettingEndTime = new Date(start.getTime() + BETTING_DURATION_SECONDS * 1000);
  const resultTime = new Date(start.getTime() + ROUND_DURATION_SECONDS * 1000);

  await TeenPattiRound.create({
    roundNumber: nextNumber,
    status: "betting",
    bettingStartTime: start,
    bettingEndTime,
    resultTime,
  });
}

// ---------------------------------------------------------------------------
// tickTeenPattiRounds(): the scheduler's entry point for Teen Patti
// Prediction, run alongside tickRounds()/tickColorRounds() every minute.
// Settles whatever round just ended regardless of the switch, then opens a
// new one only while enabled.
// ---------------------------------------------------------------------------

export async function tickTeenPattiRounds() {
  const now = new Date();

  const dueRounds = await TeenPattiRound.find({ status: "betting", bettingEndTime: { $lte: now } });
  for (const round of dueRounds) {
    await settleTeenPattiRound(round._id.toString());
  }

  if (!(await isTeenPattiEnabled())) return;

  const hasOpenRound = await TeenPattiRound.exists({ status: "betting", bettingEndTime: { $gt: now } });
  if (!hasOpenRound) {
    await createNextTeenPattiRound();
  }
}
