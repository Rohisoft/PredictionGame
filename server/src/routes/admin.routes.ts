import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  adminAdjustPoints,
  adminCreateUser,
  adminGetUserTransactions,
  adminListUsers,
} from "../services/adminService.js";
import { adminAdjustPointsSchema, adminCreateUserSchema, adminListUsersSchema } from "../validation.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { search, limit } = adminListUsersSchema.parse(req.query);
    const users = await adminListUsers(req.userId!, search, limit ?? 50);
    res.json(users);
  }),
);

adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const { email, fullName } = adminCreateUserSchema.parse(req.body);
    const user = await adminCreateUser(req.userId!, email, fullName);
    res.status(201).json(user);
  }),
);

adminRouter.get(
  "/users/:id/transactions",
  asyncHandler(async (req, res) => {
    const transactions = await adminGetUserTransactions(req.userId!, req.params.id, 20);
    res.json(transactions);
  }),
);

adminRouter.post(
  "/adjust-points",
  asyncHandler(async (req, res) => {
    const { userEmail, amount, description } = adminAdjustPointsSchema.parse(req.body);
    await adminAdjustPoints(req.userId!, userEmail, amount, description);
    res.json({ ok: true });
  }),
);
