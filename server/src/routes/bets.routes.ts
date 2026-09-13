import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { placeBet } from "../services/gameService.js";
import { getMyBetForRound, getMyBetHistory } from "../services/betService.js";
import { placeBetSchema } from "../validation.js";

export const betsRouter = Router();

betsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { roundId, selectedSide, amount } = placeBetSchema.parse(req.body);
    const bet = await placeBet(req.userId!, roundId, selectedSide, amount);
    res.status(201).json(bet);
  }),
);

betsRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const bets = await getMyBetHistory(req.userId!, limit);
    res.json(bets);
  }),
);

betsRouter.get(
  "/mine/round/:roundId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bet = await getMyBetForRound(req.userId!, req.params.roundId);
    res.json(bet);
  }),
);
