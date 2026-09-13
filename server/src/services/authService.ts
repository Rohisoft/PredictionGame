import mongoose from "mongoose";
import { User, type Role } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/tokens.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { HttpError } from "../utils/asyncHandler.js";
import { WELCOME_BONUS, PASSWORD_RESET_TOKEN_TTL_MS } from "../config/constants.js";

async function issueSession(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await User.findByIdAndUpdate(userId, { refreshTokenHash: hashOpaqueToken(refreshToken) });
  return { accessToken, refreshToken };
}

export interface CreateUserAccountInput {
  username: string;
  fullName: string;
  passwordHash: string;
  email?: string | null;
  phone?: string | null;
  role?: Role;
  createdBy?: string | null;
  /** Defaults to true — the person is expected to change it after their first login. */
  mustChangePassword?: boolean;
}

/**
 * Creates a user + wallet in one transaction. Only plain player accounts
 * (`role: "user"`, the default) get the points welcome bonus — admin
 * accounts start at 0 and have to be recharged by a superadmin, since
 * giving points to a player now costs the admin their own balance (see
 * adminService.adminAdjustPoints) rather than minting from nowhere.
 *
 * Admin-created accounts get an admin-chosen initial password and
 * `mustChangePassword: true`, so the frontend routes them to set their own
 * password right after their first successful login.
 */
export async function createUserAccount(input: CreateUserAccountInput) {
  const username = input.username.toLowerCase();
  const role: Role = input.role ?? "user";

  const existing = await User.findOne({ username });
  if (existing) {
    throw new HttpError(409, "That username is already taken");
  }

  if (input.email) {
    const existingEmail = await User.findOne({ email: input.email.toLowerCase() });
    if (existingEmail) {
      throw new HttpError(409, "An account with that email already exists");
    }
  }

  const session = await mongoose.startSession();
  try {
    let userId!: string;

    await session.withTransaction(async () => {
      // Omit email entirely (rather than setting it to null) when there
      // isn't one — see the comment on the schema field for why that
      // matters for the sparse unique index.
      const [user] = await User.create(
        [
          {
            username,
            fullName: input.fullName,
            passwordHash: input.passwordHash,
            ...(input.email ? { email: input.email.toLowerCase() } : {}),
            phone: input.phone ?? null,
            role,
            createdBy: input.createdBy ?? null,
            mustChangePassword: input.mustChangePassword ?? true,
          },
        ],
        { session },
      );

      const startingBalance = role === "user" ? WELCOME_BONUS : 0;
      const [wallet] = await Wallet.create([{ userId: user._id, balance: startingBalance }], { session });
      if (startingBalance > 0) {
        await WalletTransaction.create(
          [
            {
              userId: user._id,
              walletId: wallet._id,
              transactionType: "adjustment",
              amount: startingBalance,
              balanceBefore: 0,
              balanceAfter: startingBalance,
              description: "Welcome bonus",
            },
          ],
          { session },
        );
      }
      userId = user._id.toString();
    });

    return userId;
  } finally {
    await session.endSession();
  }
}

export async function login(username: string, password: string) {
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid username or password");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid username or password");
  }

  const tokens = await issueSession(user._id.toString());
  return { userId: user._id.toString(), ...tokens };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId);
  if (!user || !user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(401, "Current password is incorrect");
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  // Re-issue a fresh session rather than invalidating it — the person is
  // already authenticated, this isn't a "someone reset it for me" event.
  return issueSession(user._id.toString());
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }

  const user = await User.findById(payload.sub).select("refreshTokenHash");
  if (!user || user.refreshTokenHash !== hashOpaqueToken(refreshToken)) {
    // Token was rotated out (logged in elsewhere) or user logged out.
    throw new HttpError(401, "Session no longer valid");
  }

  return issueSession(user._id.toString());
}

export async function logout(userId: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}

export async function requestPasswordReset(username: string, buildResetUrl: (rawToken: string) => string) {
  const user = await User.findOne({ username: username.toLowerCase() });
  // Don't reveal whether the account exists — always behave the same either way.
  if (!user) return;

  const { raw, hash } = generateOpaqueToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save();

  if (user.email) {
    await sendPasswordResetEmail(user.email, buildResetUrl(raw));
  } else {
    console.log(`[auth] No email on file for ${user.username} — share this link with them directly: ${buildResetUrl(raw)}`);
  }
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new HttpError(400, "That reset link is invalid or has expired");
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.mustChangePassword = false;
  user.refreshTokenHash = null; // sign out everywhere on password change
  await user.save();
}
