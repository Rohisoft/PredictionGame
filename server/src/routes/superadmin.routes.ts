import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { superAdminAdjustAdminPoints, superAdminCreateAdmin, superAdminListAdmins } from "../services/adminService.js";
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
