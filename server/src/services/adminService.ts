import mongoose from "mongoose";
import { User, USERNAME_PATTERN } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/password.js";
import { createUserAccount } from "./authService.js";

async function requireAdminUser(adminUserId: string) {
  const admin = await User.findById(adminUserId).select("isAdmin");
  if (!admin?.isAdmin) {
    throw new HttpError(403, "Not authorized");
  }
}

function normalizeCandidate(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

/**
 * Checks whether `username` is free, and — if not — proposes a handful of
 * available alternatives (optionally incorporating `phone`'s digits, since
 * a phone number is a perfectly valid username under USERNAME_PATTERN).
 */
export async function adminSuggestUsernames(adminUserId: string, usernameInput: string, phone?: string) {
  await requireAdminUser(adminUserId);

  const base = normalizeCandidate(usernameInput);
  if (!USERNAME_PATTERN.test(base)) {
    throw new HttpError(400, "Username must be 3-30 characters: letters, numbers, '.' or '_' only");
  }

  const existing = await User.findOne({ username: base }).select("username");
  if (!existing) {
    return { available: true, suggestions: [] as string[] };
  }

  const candidates: string[] = [];
  const phoneDigits = phone?.replace(/\D/g, "");

  if (phoneDigits && phoneDigits.length >= 4) {
    candidates.push(normalizeCandidate(`${base}${phoneDigits.slice(-4)}`));
    candidates.push(normalizeCandidate(`${base}_${phoneDigits.slice(-4)}`));
    if (phoneDigits.length >= 6 && USERNAME_PATTERN.test(phoneDigits)) {
      candidates.push(phoneDigits);
    }
  }
  for (let i = 1; i <= 20 && candidates.length < 10; i++) {
    candidates.push(normalizeCandidate(`${base}${i}`));
  }
  for (let i = 0; i < 3; i++) {
    candidates.push(normalizeCandidate(`${base}${Math.floor(100 + Math.random() * 900)}`));
  }

  const uniqueCandidates = Array.from(new Set(candidates)).filter((c) => USERNAME_PATTERN.test(c));
  const taken = await User.find({ username: { $in: uniqueCandidates } }).select("username");
  const takenSet = new Set(taken.map((u) => u.username));

  const suggestions = uniqueCandidates.filter((c) => !takenSet.has(c)).slice(0, 5);
  return { available: false, suggestions };
}

export interface AdminCreateUserInput {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

/**
 * Admin-only account creation — the admin picks the initial password too.
 * `mustChangePassword` defaults to true (see createUserAccount), so the
 * frontend routes the person to set their own password right after their
 * first successful login.
 */
export async function adminCreateUser(adminUserId: string, input: AdminCreateUserInput) {
  await requireAdminUser(adminUserId);

  const username = normalizeCandidate(input.username);
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, "Username must be 3-30 characters: letters, numbers, '.' or '_' only");
  }

  const passwordHash = await hashPassword(input.password);
  const userId = await createUserAccount({
    username,
    fullName: input.fullName,
    passwordHash,
    email: input.email || null,
    phone: input.phone || null,
  });

  return User.findById(userId).select("username email phone fullName isAdmin mustChangePassword createdAt updatedAt");
}

/**
 * Admin resets someone's password directly — for recovery when the person
 * has no email on file (so "forgot password" has nowhere to send a link)
 * or is otherwise locked out. Forces a change on their next login and
 * signs out any existing session, same as a normal password reset.
 */
export async function adminSetUserPassword(adminUserId: string, targetUsername: string, newPassword: string) {
  await requireAdminUser(adminUserId);

  const targetUser = await User.findOne({ username: targetUsername.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No user found with that username");
  }

  targetUser.passwordHash = await hashPassword(newPassword);
  targetUser.mustChangePassword = true;
  targetUser.refreshTokenHash = null;
  await targetUser.save();
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
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
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
  targetUsername: string,
  amount: number,
  description?: string,
) {
  await requireAdminUser(adminUserId);

  if (amount === 0) {
    throw new HttpError(400, "Amount must not be zero");
  }

  const targetUser = await User.findOne({ username: targetUsername.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No user found with that username");
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
