import { z } from "zod";

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "3-30 characters: letters, numbers, '.' or '_' only");

export const adminAdjustPointsSchema = z.object({
  username: usernameField,
  // Positive credits, negative debits — never zero.
  amount: z
    .number()
    .refine((v) => v !== 0, { message: "Amount must not be zero" }),
  description: z.string().trim().max(200).optional(),
});

export type AdminAdjustPointsInput = z.infer<typeof adminAdjustPointsSchema>;

export const adminCreateUserSchema = z.object({
  username: usernameField,
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Enter a full name"),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminSetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
