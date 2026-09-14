import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { getCurrentRound, getRecentRounds, getRoundById, isGameRunning } from "../services/gameService.js";
import { getRoundBetStats } from "../services/betService.js";

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

roundsRouter.get(
  "/:id/stats",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getRoundBetStats(req.params.id));
  }),
);
