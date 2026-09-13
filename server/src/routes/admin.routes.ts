import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  adminAdjustPoints,
  adminCreateUser,
  adminGetUserTransactions,
  adminListUsers,
  adminSetUserPassword,
  adminSuggestUsernames,
} from "../services/adminService.js";
import {
  adminAdjustPointsSchema,
  adminCreateUserSchema,
  adminListUsersSchema,
  adminSetPasswordSchema,
  adminSuggestUsernameSchema,
} from "../validation.js";

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

adminRouter.get(
  "/users/check-username",
  asyncHandler(async (req, res) => {
    const { username, phone } = adminSuggestUsernameSchema.parse(req.query);
    const result = await adminSuggestUsernames(req.userId!, username, phone);
    res.json(result);
  }),
);

adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const input = adminCreateUserSchema.parse(req.body);
    const user = await adminCreateUser(req.userId!, input);
    res.status(201).json(user);
  }),
);

adminRouter.post(
  "/users/set-password",
  asyncHandler(async (req, res) => {
    const { username, password } = adminSetPasswordSchema.parse(req.body);
    await adminSetUserPassword(req.userId!, username, password);
    res.json({ ok: true });
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
    const { username, amount, description } = adminAdjustPointsSchema.parse(req.body);
    await adminAdjustPoints(req.userId!, username, amount, description);
    res.json({ ok: true });
  }),
);
