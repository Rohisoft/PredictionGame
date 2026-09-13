import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";
import { createUserAccount } from "./authService.js";

async function requireAdminUser(adminUserId: string) {
  const admin = await User.findById(adminUserId).select("isAdmin");
  if (!admin?.isAdmin) {
    throw new HttpError(403, "Not authorized");
  }
}

/**
 * Admin-only account creation: no password is set here at all. The person
 * activates their own account later by running the password-reset flow for
 * their email (there's no separate "activation token" system — setting a
 * password from null is the same operation resetPassword() already does
 * for an existing password).
 */
export async function adminCreateUser(adminUserId: string, email: string, fullName: string) {
  await requireAdminUser(adminUserId);
  const userId = await createUserAccount(email, fullName, null);
  const user = await User.findById(userId).select("email fullName isAdmin createdAt updatedAt");
  return user;
}

/**
 * Lists users with their current wallet balance for the admin users table.
 * Mongo has no cross-collection join, so this fetches users, then fetches
 * just the wallets for those user ids, and merges them in memory — fine at
 * the scale an admin-managed points system like this runs at.
 */
export async function adminListUsers(callerId: string, search: string | undefined, limit = 50) {
  await requireAdminUser(callerId);

  const filter = search
    ? {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 200));
  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } });
  const balanceByUserId = new Map(wallets.map((w) => [w.userId.toString(), w.balance]));

  return users.map((user) => {
    const json = user.toJSON() as unknown as { id: string } & Record<string, unknown>;
    return { ...json, balance: balanceByUserId.get(user._id.toString()) ?? 0 };
  });
}

export async function adminGetUserTransactions(callerId: string, targetUserId: string, limit = 20) {
  await requireAdminUser(callerId);
  return WalletTransaction.find({ userId: targetUserId }).sort({ createdAt: -1 }).limit(limit);
}

/**
 * Credits OR debits a user's wallet (positive amount = credit, negative =
 * debit). The route calling this already requires `req.userId`'s own
 * `isAdmin` flag via the `requireAdmin` middleware, but this is re-checked
 * here too since it's a mutation with real consequences.
 */
export async function adminAdjustPoints(
  adminUserId: string,
  targetEmail: string,
  amount: number,
  description?: string,
) {
  await requireAdminUser(adminUserId);

  if (amount === 0) {
    throw new HttpError(400, "Amount must not be zero");
  }

  const targetUser = await User.findOne({ email: targetEmail.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No user found with that email");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId: targetUser._id }).session(session);
      if (!wallet) throw new HttpError(404, "Wallet not found for that user");

      // Condition-guarded so a debit can never push the balance negative,
      // same pattern as the wallet debit in placeBet().
      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: -amount } },
        { $inc: { balance: amount } },
        { session, new: true },
      );
      if (!updatedWallet) throw new HttpError(400, "That would take the user's balance below zero");

      await WalletTransaction.create(
        [
          {
            userId: targetUser._id,
            walletId: wallet._id,
            transactionType: "adjustment",
            amount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description: description ?? (amount > 0 ? "Admin credit" : "Admin debit"),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
