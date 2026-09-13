import { Schema, model, Types } from "mongoose";

export const TRANSACTION_TYPES = ["deposit", "withdrawal", "bet", "payout", "refund", "adjustment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const walletTransactionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    walletId: { type: Types.ObjectId, ref: "Wallet", required: true },
    transactionType: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: Types.ObjectId, default: null },
    description: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

walletTransactionSchema.index({ createdAt: -1 });

export const WalletTransaction = model("WalletTransaction", walletTransactionSchema);
