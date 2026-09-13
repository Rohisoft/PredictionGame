import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { HttpError } from "../utils/asyncHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken as string | undefined;

  if (!token) {
    next(new HttpError(401, "Not authenticated"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const user = await User.findById(req.userId).select("isAdmin");
  if (!user?.isAdmin) {
    throw new HttpError(403, "Not authorized");
  }
  next();
});
