import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getCurrentColorRound,
  getColorRoundById,
  getRecentColorRounds,
  isColorGameEnabled,
} from "../services/colorGameService.js";

export const colorRoundsRouter = Router();

colorRoundsRouter.get(
  "/game-state",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ enabled: await isColorGameEnabled() });
  }),
);

colorRoundsRouter.get(
  "/current",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const round = await getCurrentColorRound();
    res.json(round);
  }),
);

colorRoundsRouter.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rounds = await getRecentColorRounds(limit);
    res.json(rounds);
  }),
);

colorRoundsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const round = await getColorRoundById(req.params.id);
    if (!round) throw new HttpError(404, "Round not found");
    res.json(round);
  }),
);
