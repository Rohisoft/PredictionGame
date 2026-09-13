import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { adminAddPoints } from "../services/adminService.js";
import { adminAddPointsSchema } from "../validation.js";

export const adminRouter = Router();

adminRouter.post(
  "/add-points",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { userEmail, amount, description } = adminAddPointsSchema.parse(req.body);
    await adminAddPoints(req.userId!, userEmail, amount, description);
    res.json({ ok: true });
  }),
);
