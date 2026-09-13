import { z } from "zod";
import { STAKE_AMOUNTS } from "./config/constants.js";

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(2),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const placeBetSchema = z.object({
  roundId: z.string().min(1),
  selectedSide: z.enum(["odd", "even"]),
  amount: z.number().refine((v) => STAKE_AMOUNTS.includes(v as (typeof STAKE_AMOUNTS)[number])),
});

export const adminAdjustPointsSchema = z.object({
  userEmail: z.string().trim().email(),
  // Positive to credit, negative to debit — never zero.
  amount: z.number().refine((v) => v !== 0, { message: "Amount must not be zero" }),
  description: z.string().trim().max(200).optional(),
});

export const adminListUsersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
