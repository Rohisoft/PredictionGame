import { z } from "zod";
import { STAKE_AMOUNTS } from "@/types/game";

export const betSchema = z.object({
  roundId: z.string().uuid(),
  selectedSide: z.enum(["odd", "even"]),
  amount: z.number().refine((v) => STAKE_AMOUNTS.includes(v as 10 | 20 | 50 | 100), {
    message: `Stake must be one of ${STAKE_AMOUNTS.join(", ")}`,
  }),
});

export type BetInput = z.infer<typeof betSchema>;

export const adminAddPointsSchema = z.object({
  userEmail: z.string().trim().email("Enter a valid email address"),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().trim().max(200).optional(),
});

export type AdminAddPointsInput = z.infer<typeof adminAddPointsSchema>;
