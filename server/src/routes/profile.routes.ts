import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const profileRouter = Router();

profileRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select("email fullName isAdmin createdAt updatedAt");
    if (!user) throw new HttpError(404, "User not found");
    res.json(user);
  }),
);
