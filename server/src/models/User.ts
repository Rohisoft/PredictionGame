import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
    // Hash of the single currently-valid refresh token, so logout / login
    // elsewhere can invalidate it. Simplification: one active session per
    // user (logging in on a new device signs the old one out).
    refreshTokenHash: { type: String, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

// Only ever used for the `/profile` response — never serializes
// passwordHash/refreshTokenHash/reset tokens because routes explicitly
// `.select()` away from them before calling res.json().
userSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      id: ret._id.toString(),
      full_name: ret.fullName ?? null,
      email: ret.email,
      is_admin: ret.isAdmin ?? false,
      created_at: ret.createdAt,
      updated_at: ret.updatedAt,
    };
  },
});

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
