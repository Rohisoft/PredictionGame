import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { GameSettings, GAME_SETTINGS_ID } from "../models/GameSettings.js";
import { HttpError } from "../utils/asyncHandler.js";
import { SPIN_COOLDOWN_MS, SPIN_SEGMENTS } from "../config/constants.js";

const TOTAL_WEIGHT = SPIN_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);

// Cryptographically secure, weighted pick over SPIN_SEGMENTS — same
// fairness pattern as the dice roll in gameService.settleRound(): generated
// once, server-side, via Node's CSPRNG, with no way for the client to
// influence or predict it.
function pickSegmentIndex(): number {
  let roll = randomInt(0, TOTAL_WEIGHT);
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    roll -= SPIN_SEGMENTS[i].weight;
    if (roll < 0) return i;
  }
  /* istanbul ignore next -- unreachable: weights sum to TOTAL_WEIGHT */
  return SPIN_SEGMENTS.length - 1;
}

export async function isSpinEnabled() {
  const settings = await GameSettings.findById(GAME_SETTINGS_ID);
  return settings?.isSpinEnabled ?? true;
}

export async function setSpinEnabled(enabled: boolean) {
  await GameSettings.findByIdAndUpdate(
    GAME_SETTINGS_ID,
    { isSpinEnabled: enabled },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return { enabled };
}

export async function getSpinState(userId: string) {
  const user = await User.findById(userId).select("lastSpinAt");
  if (!user) throw new HttpError(404, "User not found");

  const enabled = await isSpinEnabled();
  const nextSpinAt = user.lastSpinAt ? new Date(user.lastSpinAt.getTime() + SPIN_COOLDOWN_MS) : null;
  const canSpin = enabled && (!nextSpinAt || nextSpinAt.getTime() <= Date.now());

  return {
    enabled,
    canSpin,
    nextSpinAt: canSpin ? null : nextSpinAt,
    segments: SPIN_SEGMENTS.map((segment) => segment.value),
  };
}

export async function spinWheel(userId: string) {
  if (!(await isSpinEnabled())) {
    throw new HttpError(403, "Spin & Win is currently disabled");
  }

  const session = await mongoose.startSession();
  try {
    let result: { segmentIndex: number; value: number; nextSpinAt: Date } | undefined;

    await session.withTransaction(async () => {
      const now = new Date();
      const cutoff = new Date(now.getTime() - SPIN_COOLDOWN_MS);

      const user = await User.findById(userId).select("lastSpinAt").session(session);
      if (!user) throw new HttpError(404, "User not found");

      // Atomically claim the spin slot — only matches if this user has
      // never spun, or their cooldown already elapsed. This is what stops
      // two near-simultaneous requests both landing a payout.
      const claimed = await User.findOneAndUpdate(
        { _id: userId, $or: [{ lastSpinAt: null }, { lastSpinAt: { $lte: cutoff } }] },
        { $set: { lastSpinAt: now } },
        { session },
      );
      if (!claimed) {
        throw new HttpError(429, "You've already spun today — come back later");
      }

      const segmentIndex = pickSegmentIndex();
      const value = SPIN_SEGMENTS[segmentIndex].value;

      if (value > 0) {
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) throw new HttpError(404, "Wallet not found");

        const updatedWallet = await Wallet.findOneAndUpdate(
          { _id: wallet._id },
          { $inc: { balance: value } },
          { session, new: true },
        );

        await WalletTransaction.create(
          [
            {
              userId,
              walletId: wallet._id,
              transactionType: "bonus",
              amount: value,
              balanceBefore: wallet.balance,
              balanceAfter: updatedWallet!.balance,
              description: "Daily Spin & Win",
            },
          ],
          { session },
        );
      }

      result = { segmentIndex, value, nextSpinAt: new Date(now.getTime() + SPIN_COOLDOWN_MS) };
    });

    return result!;
  } finally {
    await session.endSession();
  }
}
