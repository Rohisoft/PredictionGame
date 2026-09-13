import { z } from "zod";

export const adminAdjustPointsSchema = z.object({
  userEmail: z.string().trim().email("Enter a valid email address"),
  // Positive credits, negative debits — never zero.
  amount: z
    .number()
    .refine((v) => v !== 0, { message: "Amount must not be zero" }),
  description: z.string().trim().max(200).optional(),
});

export type AdminAdjustPointsInput = z.infer<typeof adminAdjustPointsSchema>;

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  fullName: z.string().trim().min(2, "Enter a full name"),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
