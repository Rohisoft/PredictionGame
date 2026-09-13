import { Schema, model, Types, type InferSchemaType } from "mongoose";

// Login identifier. Letters/digits/underscore/dot only, so a phone number
// (digits) works fine as a username too, per how admin account creation
// uses it.
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

export const ROLES = ["user", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Optional contact info — neither is the login identifier anymore.
    // email (when present) is only used to deliver "forgot password"
    // links. No `default` here on purpose: a sparse unique index only
    // skips documents where the field is truly absent, not ones where
    // it's explicitly `null` — a `default: null` would give every
    // email-less user an explicit null and they'd collide on the index.
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, default: null },
    // True right after an admin creates the account (or resets someone's
    // password) — the frontend forces a change-password step before
    // letting the person into the app.
    mustChangePassword: { type: Boolean, default: true },
    fullName: { type: String, default: null },
    role: { type: String, enum: ROLES, default: "user", index: true },
    // Which admin (or superadmin) created this account — an admin can only
    // see/manage users they personally created, not everyone. null for
    // accounts that predate this field, or created directly (bootstrap).
    createdBy: { type: Types.ObjectId, ref: "User", default: null },
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
      username: ret.username,
      full_name: ret.fullName ?? null,
      email: ret.email ?? null,
      phone: ret.phone ?? null,
      role: ret.role ?? "user",
      is_admin: ret.role === "admin" || ret.role === "superadmin",
      is_super_admin: ret.role === "superadmin",
      must_change_password: ret.mustChangePassword ?? false,
      created_at: ret.createdAt,
      updated_at: ret.updatedAt,
    };
  },
});

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User = model("User", userSchema);
