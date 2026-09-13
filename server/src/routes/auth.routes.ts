import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { requireAuth } from "../middleware/auth.js";
import * as authService from "../services/authService.js";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "../validation.js";
import { env } from "../config/env.js";

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = signupSchema.parse(req.body);
    const { userId, accessToken, refreshToken } = await authService.signup(email, password, fullName);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ userId });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { userId, accessToken, refreshToken } = await authService.login(email, password);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ userId });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) throw new HttpError(401, "Not authenticated");

    const tokens = await authService.refreshSession(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logout(req.userId!);
    clearAuthCookies(res);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const frontendOrigin = env.corsOrigins[0];
    await authService.requestPasswordReset(email, (rawToken) => `${frontendOrigin}/reset-password?token=${rawToken}`);
    // Always the same response, whether or not the email exists.
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ ok: true });
  }),
);
