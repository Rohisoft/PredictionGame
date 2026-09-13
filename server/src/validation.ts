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

export const adminAddPointsSchema = z.object({
  userEmail: z.string().trim().email(),
  amount: z.number().positive(),
  description: z.string().trim().max(200).optional(),
});
