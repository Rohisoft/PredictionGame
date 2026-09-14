import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { placeColorBet } from "../services/colorGameService.js";
import { getMyColorBetForRound, getMyColorBetHistory } from "../services/colorBetService.js";
import { placeColorBetSchema } from "../validation.js";

export const colorBetsRouter = Router();

colorBetsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { roundId, selectedColor, amount } = placeColorBetSchema.parse(req.body);
    const bet = await placeColorBet(req.userId!, roundId, selectedColor, amount);
    res.status(201).json(bet);
  }),
);

colorBetsRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const bets = await getMyColorBetHistory(req.userId!, limit);
    res.json(bets);
  }),
);

colorBetsRouter.get(
  "/mine/round/:roundId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bet = await getMyColorBetForRound(req.userId!, req.params.roundId);
    res.json(bet);
  }),
);
