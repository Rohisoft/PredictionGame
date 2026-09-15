import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import {
  getCurrentTeenPattiRound,
  getTeenPattiRoundById,
  getRecentTeenPattiRounds,
  isTeenPattiEnabled,
} from "../services/teenPattiGameService.js";
import { getTeenPattiRoundBetStats } from "../services/teenPattiBetService.js";

export const teenPattiRoundsRouter = Router();

teenPattiRoundsRouter.get(
  "/game-state",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ enabled: await isTeenPattiEnabled() });
  }),
);

teenPattiRoundsRouter.get(
  "/current",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const round = await getCurrentTeenPattiRound();
    res.json(round);
  }),
);

teenPattiRoundsRouter.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rounds = await getRecentTeenPattiRounds(limit);
    res.json(rounds);
  }),
);

teenPattiRoundsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const round = await getTeenPattiRoundById(req.params.id);
    if (!round) throw new HttpError(404, "Round not found");
    res.json(round);
  }),
);

teenPattiRoundsRouter.get(
  "/:id/stats",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    res.json(await getTeenPattiRoundBetStats(req.params.id));
  }),
);
