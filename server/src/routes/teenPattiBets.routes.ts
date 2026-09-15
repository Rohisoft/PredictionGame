import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { placeTeenPattiBet } from "../services/teenPattiGameService.js";
import { getMyTeenPattiBetForRound, getMyTeenPattiBetHistory } from "../services/teenPattiBetService.js";
import { placeTeenPattiBetSchema } from "../validation.js";

export const teenPattiBetsRouter = Router();

teenPattiBetsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { roundId, selectedPlayer, amount } = placeTeenPattiBetSchema.parse(req.body);
    const bet = await placeTeenPattiBet(req.userId!, roundId, selectedPlayer, amount);
    res.status(201).json(bet);
  }),
);

teenPattiBetsRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const bets = await getMyTeenPattiBetHistory(req.userId!, limit);
    res.json(bets);
  }),
);

teenPattiBetsRouter.get(
  "/mine/round/:roundId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bet = await getMyTeenPattiBetForRound(req.userId!, req.params.roundId);
    res.json(bet);
  }),
);
