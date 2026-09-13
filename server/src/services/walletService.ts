import { Wallet } from "../models/Wallet.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { HttpError } from "../utils/asyncHandler.js";

export async function getWalletForUser(userId: string) {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) throw new HttpError(404, "Wallet not found");
  return wallet;
}

export async function getTransactionsForUser(userId: string, limit = 100) {
  return WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}
