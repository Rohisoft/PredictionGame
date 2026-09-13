import { Schema, model, Types } from "mongoose";
import { idOf } from "../utils/serialize.js";

const walletSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

walletSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      user_id: idOf(ret.userId),
      balance: ret.balance,
      created_at: ret.createdAt,
      updated_at: ret.updatedAt,
    };
  },
});

export const Wallet = model("Wallet", walletSchema);
