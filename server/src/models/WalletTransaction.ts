import { Schema, model, Types } from "mongoose";
import { idOf } from "../utils/serialize.js";

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

walletTransactionSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      user_id: idOf(ret.userId),
      wallet_id: idOf(ret.walletId),
      transaction_type: ret.transactionType,
      amount: ret.amount,
      balance_before: ret.balanceBefore,
      balance_after: ret.balanceAfter,
      reference_id: ret.referenceId ? idOf(ret.referenceId) : null,
      description: ret.description ?? null,
      created_at: ret.createdAt,
    };
  },
});

export const WalletTransaction = model("WalletTransaction", walletTransactionSchema);
