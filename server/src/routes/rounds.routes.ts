import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getCurrentRound, getRecentRounds, getRoundById, isGameRunning } from "../services/gameService.js";

export const roundsRouter = Router();

roundsRouter.get(
  "/game-state",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ is_game_running: await isGameRunning() });
  }),
);

roundsRouter.get(
  "/current",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const round = await getCurrentRound();
    res.json(round);
  }),
);

roundsRouter.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rounds = await getRecentRounds(limit);
    res.json(rounds);
  }),
);

roundsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const round = await getRoundById(req.params.id);
    if (!round) throw new HttpError(404, "Round not found");
    res.json(round);
  }),
);
