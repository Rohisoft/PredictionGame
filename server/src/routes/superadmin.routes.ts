import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { superAdminAdjustAdminPoints, superAdminCreateAdmin, superAdminListAdmins } from "../services/adminService.js";
import { isSpinEnabled, setSpinEnabled } from "../services/spinService.js";
import { getColorGameState, setColorGameEnabled } from "../services/colorGameService.js";
import { getTeenPattiGameState, setTeenPattiEnabled } from "../services/teenPattiGameService.js";
import { adminAdjustPointsSchema, adminCreateUserSchema, adminListUsersSchema } from "../validation.js";

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth, requireSuperAdmin);

superAdminRouter.get(
  "/admins",
  asyncHandler(async (req, res) => {
    const { search, limit } = adminListUsersSchema.parse(req.query);
    const admins = await superAdminListAdmins(req.userId!, search, limit ?? 50);
    res.json(admins);
  }),
);

superAdminRouter.post(
  "/admins",
  asyncHandler(async (req, res) => {
    const input = adminCreateUserSchema.parse(req.body);
    const admin = await superAdminCreateAdmin(req.userId!, input);
    res.status(201).json(admin);
  }),
);

superAdminRouter.post(
  "/admins/adjust-points",
  asyncHandler(async (req, res) => {
    const { username, amount, description } = adminAdjustPointsSchema.parse(req.body);
    await superAdminAdjustAdminPoints(req.userId!, username, amount, description);
    res.json({ ok: true });
  }),
);

// -----------------------------------------------------------------------
// Spin & Win on/off switch — superadmin only.
// -----------------------------------------------------------------------

superAdminRouter.get(
  "/spin/state",
  asyncHandler(async (_req, res) => {
    res.json({ enabled: await isSpinEnabled() });
  }),
);

superAdminRouter.post(
  "/spin/enable",
  asyncHandler(async (_req, res) => {
    res.json(await setSpinEnabled(true));
  }),
);

superAdminRouter.post(
  "/spin/disable",
  asyncHandler(async (_req, res) => {
    res.json(await setSpinEnabled(false));
  }),
);

// -----------------------------------------------------------------------
// Color Prediction on/off switch — superadmin only.
// -----------------------------------------------------------------------

function serializeColorState(state: { enabled: boolean; currentRound: unknown }) {
  return { enabled: state.enabled, current_round: state.currentRound };
}

superAdminRouter.get(
  "/color/state",
  asyncHandler(async (_req, res) => {
    res.json(serializeColorState(await getColorGameState()));
  }),
);

superAdminRouter.post(
  "/color/enable",
  asyncHandler(async (_req, res) => {
    res.json(serializeColorState(await setColorGameEnabled(true)));
  }),
);

superAdminRouter.post(
  "/color/disable",
  asyncHandler(async (_req, res) => {
    res.json(serializeColorState(await setColorGameEnabled(false)));
  }),
);

// -----------------------------------------------------------------------
// Teen Patti Prediction on/off switch — superadmin only.
// -----------------------------------------------------------------------

function serializeTeenPattiState(state: { enabled: boolean; currentRound: unknown }) {
  return { enabled: state.enabled, current_round: state.currentRound };
}

superAdminRouter.get(
  "/teenpatti/state",
  asyncHandler(async (_req, res) => {
    res.json(serializeTeenPattiState(await getTeenPattiGameState()));
  }),
);

superAdminRouter.post(
  "/teenpatti/enable",
  asyncHandler(async (_req, res) => {
    res.json(serializeTeenPattiState(await setTeenPattiEnabled(true)));
  }),
);

superAdminRouter.post(
  "/teenpatti/disable",
  asyncHandler(async (_req, res) => {
    res.json(serializeTeenPattiState(await setTeenPattiEnabled(false)));
  }),
);
