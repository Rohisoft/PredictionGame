import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";

/**
 * Credits a user's wallet. The route calling this already requires
 * `req.userId`'s own `isAdmin` flag via the `requireAdmin` middleware, but
 * this is re-checked here too since it's a mutation with real consequences.
 */
export async function adminAddPoints(adminUserId: string, targetEmail: string, amount: number, description?: string) {
  const admin = await User.findById(adminUserId).select("isAdmin");
  if (!admin?.isAdmin) {
    throw new HttpError(403, "Not authorized");
  }

  if (amount <= 0) {
    throw new HttpError(400, "Amount must be positive");
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

      const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { balance: amount } },
        { session, new: true },
      );

      await WalletTransaction.create(
        [
          {
            userId: targetUser._id,
            walletId: wallet._id,
            transactionType: "adjustment",
            amount,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet!.balance,
            description: description ?? "Admin adjustment",
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
