import mongoose from "mongoose";
import { User } from "../models/User.js";
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

/**
 * Creates a user + wallet (with the welcome bonus) in one transaction.
 * `passwordHash` is null for admin-created accounts — the person activates
 * it themselves later via the password-reset flow (see resetPassword()
 * below; there's nothing activation-specific about it, setting a password
 * from null is the same operation as changing an existing one).
 */
export async function createUserAccount(email: string, fullName: string, passwordHash: string | null) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "An account with that email already exists");
  }

  const session = await mongoose.startSession();
  try {
    let userId!: string;

    await session.withTransaction(async () => {
      const [user] = await User.create([{ email: email.toLowerCase(), passwordHash, fullName }], { session });
      const [wallet] = await Wallet.create([{ userId: user._id, balance: WELCOME_BONUS }], { session });
      await WalletTransaction.create(
        [
          {
            userId: user._id,
            walletId: wallet._id,
            transactionType: "adjustment",
            amount: WELCOME_BONUS,
            balanceBefore: 0,
            balanceAfter: WELCOME_BONUS,
            description: "Welcome bonus",
          },
        ],
        { session },
      );
      userId = user._id.toString();
    });

    return userId;
  } finally {
    await session.endSession();
  }
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.passwordHash) {
    throw new HttpError(401, "This account doesn't have a password yet — use \"Forgot password\" to set one");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const tokens = await issueSession(user._id.toString());
  return { userId: user._id.toString(), ...tokens };
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

export async function requestPasswordReset(email: string, buildResetUrl: (rawToken: string) => string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Don't reveal whether the email exists — always behave the same either way.
  if (!user) return;

  const { raw, hash } = generateOpaqueToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save();

  await sendPasswordResetEmail(user.email, buildResetUrl(raw));
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
  user.refreshTokenHash = null; // sign out everywhere on password change
  await user.save();
}
