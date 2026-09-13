import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getTransactionsForUser, getWalletForUser } from "../services/walletService.js";

export const walletRouter = Router();

walletRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const wallet = await getWalletForUser(req.userId!);
    res.json(wallet);
  }),
);

walletRouter.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transactions = await getTransactionsForUser(req.userId!);
    res.json(transactions);
  }),
);
