import mongoose from "mongoose";
import { User, USERNAME_PATTERN } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/password.js";
import { createUserAccount } from "./authService.js";

async function loadAdminCaller(callerId: string) {
  const caller = await User.findById(callerId).select("role username");
  if (!caller || (caller.role !== "admin" && caller.role !== "superadmin")) {
    throw new HttpError(403, "Not authorized");
  }
  return caller;
}

async function loadSuperAdminCaller(callerId: string) {
  const caller = await User.findById(callerId).select("role username");
  if (!caller || caller.role !== "superadmin") {
    throw new HttpError(403, "Not authorized");
  }
  return caller;
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
export async function adminSuggestUsernames(callerId: string, usernameInput: string, phone?: string) {
  await loadAdminCaller(callerId);

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

export interface CreateAccountInput {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}

/**
 * Admin (or superadmin) creates a PLAYER account. Starts at 0 balance plus
 * the standard welcome bonus — nothing is deducted from the creating
 * admin for this, only for actually giving the player points afterward
 * (see adminAdjustPoints).
 */
export async function adminCreateUser(callerId: string, input: CreateAccountInput) {
  const caller = await loadAdminCaller(callerId);

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
    role: "user",
    createdBy: caller._id.toString(),
  });

  return User.findById(userId).select(
    "username email phone fullName role createdBy mustChangePassword createdAt updatedAt",
  );
}

/**
 * Superadmin-only: creates an ADMIN account. Starts at 0 balance and no
 * welcome bonus — an admin has nothing to give players until a superadmin
 * recharges them (see adminAdjustAdminPoints).
 */
export async function superAdminCreateAdmin(callerId: string, input: CreateAccountInput) {
  const caller = await loadSuperAdminCaller(callerId);

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
    role: "admin",
    createdBy: caller._id.toString(),
  });

  return User.findById(userId).select(
    "username email phone fullName role createdBy mustChangePassword createdAt updatedAt",
  );
}

/**
 * Admin resets a player's password directly — for recovery when the
 * person has no email on file or is otherwise locked out. Superadmin can
 * do this for anyone (including other admins); a plain admin only for
 * players they created.
 */
export async function adminSetUserPassword(callerId: string, targetUsername: string, newPassword: string) {
  const caller = await loadAdminCaller(callerId);

  const targetUser = await User.findOne({ username: targetUsername.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No user found with that username");
  }

  if (caller.role === "admin") {
    if (targetUser.role !== "user" || String(targetUser.createdBy) !== String(caller._id)) {
      throw new HttpError(403, "You can only manage users you created");
    }
  }

  targetUser.passwordHash = await hashPassword(newPassword);
  targetUser.mustChangePassword = true;
  targetUser.refreshTokenHash = null;
  await targetUser.save();
}

/**
 * Lists player accounts with their current wallet balance. A plain admin
 * only sees players they created; a superadmin sees every player. Mongo
 * has no cross-collection join, so this fetches users, then fetches just
 * the wallets for those user ids, and merges them in memory — fine at the
 * scale an admin-managed points system like this runs at.
 */
export async function adminListUsers(callerId: string, search: string | undefined, limit = 50) {
  const caller = await loadAdminCaller(callerId);

  const filter: Record<string, unknown> = { role: "user" };
  if (caller.role === "admin") {
    filter.createdBy = caller._id;
  }
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
    ];
  }

  return listUsersWithBalance(filter, limit);
}

/** Superadmin-only: lists admin accounts with their current balance. */
export async function superAdminListAdmins(callerId: string, search: string | undefined, limit = 50) {
  await loadSuperAdminCaller(callerId);

  const filter: Record<string, unknown> = { role: "admin" };
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
    ];
  }

  return listUsersWithBalance(filter, limit);
}

async function listUsersWithBalance(filter: Record<string, unknown>, limit: number) {
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200));
  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } });
  const balanceByUserId = new Map(wallets.map((w) => [w.userId.toString(), w.balance]));

  return users.map((user) => {
    const json = user.toJSON() as unknown as { id: string } & Record<string, unknown>;
    return { ...json, balance: balanceByUserId.get(user._id.toString()) ?? 0 };
  });
}

export async function adminGetUserTransactions(callerId: string, targetUserId: string, limit = 20) {
  const caller = await loadAdminCaller(callerId);

  const target = await User.findById(targetUserId).select("role createdBy");
  if (!target) throw new HttpError(404, "User not found");

  if (caller.role === "admin" && (target.role !== "user" || String(target.createdBy) !== String(caller._id))) {
    throw new HttpError(403, "You can only view activity for users you created");
  }

  return WalletTransaction.find({ userId: targetUserId }).sort({ createdAt: -1 }).limit(limit);
}

/**
 * Transfers points between the caller (an admin or superadmin) and a
 * player they manage — positive amount = caller gives points to the
 * player (deducted from the caller's own wallet); negative = caller
 * reclaims points from the player (credited back to the caller). Neither
 * side can go negative. The caller can never target their own account —
 * that's the point of this being a transfer rather than a mint.
 */
export async function adminAdjustPoints(callerId: string, targetUsername: string, amount: number, description?: string) {
  const caller = await loadAdminCaller(callerId);

  if (amount === 0) {
    throw new HttpError(400, "Amount must not be zero");
  }

  const targetUser = await User.findOne({ username: targetUsername.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No user found with that username");
  }

  if (targetUser._id.equals(caller._id)) {
    throw new HttpError(400, "You can't adjust your own balance");
  }

  if (targetUser.role !== "user") {
    throw new HttpError(400, "You can only adjust points for a player account");
  }

  if (caller.role === "admin" && String(targetUser.createdBy) !== String(caller._id)) {
    throw new HttpError(403, "You can only manage users you created");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const callerWallet = await Wallet.findOne({ userId: caller._id }).session(session);
      const targetWallet = await Wallet.findOne({ userId: targetUser._id }).session(session);
      if (!callerWallet) throw new HttpError(404, "Your own wallet was not found");
      if (!targetWallet) throw new HttpError(404, "Wallet not found for that user");

      if (amount > 0) {
        // Give: caller -= amount, target += amount.
        const updatedCallerWallet = await Wallet.findOneAndUpdate(
          { _id: callerWallet._id, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { session, new: true },
        );
        if (!updatedCallerWallet) throw new HttpError(400, "You don't have enough points to give that much");

        const updatedTargetWallet = await Wallet.findOneAndUpdate(
          { _id: targetWallet._id },
          { $inc: { balance: amount } },
          { session, new: true },
        );

        await WalletTransaction.create(
          [
            {
              userId: caller._id,
              walletId: callerWallet._id,
              transactionType: "adjustment",
              amount: -amount,
              balanceBefore: callerWallet.balance,
              balanceAfter: updatedCallerWallet.balance,
              description: `Sent to @${targetUser.username}`,
            },
            {
              userId: targetUser._id,
              walletId: targetWallet._id,
              transactionType: "adjustment",
              amount,
              balanceBefore: targetWallet.balance,
              balanceAfter: updatedTargetWallet!.balance,
              description: description ?? `Received from @${caller.username}`,
            },
          ],
          { session, ordered: true },
        );
      } else {
        // Reclaim: target -= |amount|, caller += |amount|.
        const take = -amount;
        const updatedTargetWallet = await Wallet.findOneAndUpdate(
          { _id: targetWallet._id, balance: { $gte: take } },
          { $inc: { balance: -take } },
          { session, new: true },
        );
        if (!updatedTargetWallet) throw new HttpError(400, "That would take the user's balance below zero");

        const updatedCallerWallet = await Wallet.findOneAndUpdate(
          { _id: callerWallet._id },
          { $inc: { balance: take } },
          { session, new: true },
        );

        await WalletTransaction.create(
          [
            {
              userId: targetUser._id,
              walletId: targetWallet._id,
              transactionType: "adjustment",
              amount: -take,
              balanceBefore: targetWallet.balance,
              balanceAfter: updatedTargetWallet.balance,
              description: description ?? `Reclaimed by @${caller.username}`,
            },
            {
              userId: caller._id,
              walletId: callerWallet._id,
              transactionType: "adjustment",
              amount: take,
              balanceBefore: callerWallet.balance,
              balanceAfter: updatedCallerWallet!.balance,
              description: `Reclaimed from @${targetUser.username}`,
            },
          ],
          { session, ordered: true },
        );
      }
    });
  } finally {
    await session.endSession();
  }
}

/**
 * Superadmin-only: credits (or debits) an ADMIN's own wallet directly —
 * this is the "mint" step of the economy, not a transfer, since nothing
 * sits above a superadmin to deduct from. This is how an admin who's run
 * out of points to give players gets recharged.
 */
export async function superAdminAdjustAdminPoints(
  callerId: string,
  targetUsername: string,
  amount: number,
  description?: string,
) {
  await loadSuperAdminCaller(callerId);

  if (amount === 0) {
    throw new HttpError(400, "Amount must not be zero");
  }

  const targetUser = await User.findOne({ username: targetUsername.toLowerCase() });
  if (!targetUser) {
    throw new HttpError(404, "No admin found with that username");
  }
  if (targetUser.role !== "admin") {
    throw new HttpError(400, "You can only adjust points for an admin account");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ userId: targetUser._id }).session(session);
      if (!wallet) throw new HttpError(404, "Wallet not found for that admin");

      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: -amount } },
        { $inc: { balance: amount } },
        { session, new: true },
      );
      if (!updatedWallet) throw new HttpError(400, "That would take the admin's balance below zero");

      await WalletTransaction.create(
        [
          {
            userId: targetUser._id,
            walletId: wallet._id,
            transactionType: "adjustment",
            amount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            description: description ?? (amount > 0 ? "Recharge from superadmin" : "Deducted by superadmin"),
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
