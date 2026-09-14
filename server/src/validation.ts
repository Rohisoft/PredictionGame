import { z } from "zod";
import { STAKE_AMOUNTS } from "./config/constants.js";

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "3-30 characters: letters, numbers, '.' or '_' only");

export const loginSchema = z.object({
  username: usernameField,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  username: usernameField,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const placeBetSchema = z.object({
  roundId: z.string().min(1),
  selectedSide: z.enum(["odd", "even"]),
  amount: z.number().refine((v) => STAKE_AMOUNTS.includes(v as (typeof STAKE_AMOUNTS)[number])),
});

export const placeColorBetSchema = z.object({
  roundId: z.string().min(1),
  selectedColor: z.enum(["red", "green"]),
  amount: z.number().refine((v) => STAKE_AMOUNTS.includes(v as (typeof STAKE_AMOUNTS)[number])),
});

export const adminAdjustPointsSchema = z.object({
  username: usernameField,
  // Positive to credit, negative to debit — never zero.
  amount: z.number().refine((v) => v !== 0, { message: "Amount must not be zero" }),
  description: z.string().trim().max(200).optional(),
});

export const adminListUsersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const adminCreateUserSchema = z.object({
  username: usernameField,
  password: z.string().min(8),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const adminSuggestUsernameSchema = z.object({
  username: z.string().trim().min(1),
  phone: z.string().trim().max(20).optional(),
});

export const adminSetPasswordSchema = z.object({
  username: usernameField,
  password: z.string().min(8),
});
