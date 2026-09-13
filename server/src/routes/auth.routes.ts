import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { requireAuth } from "../middleware/auth.js";
import * as authService from "../services/authService.js";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from "../validation.js";
import { env } from "../config/env.js";

export const authRouter = Router();

// No public self-signup — accounts are created by an admin (see
// POST /admin/users), who also sets the initial password. The person is
// expected to change it via POST /auth/change-password after their first
// login (see User.mustChangePassword / the frontend's forced redirect).

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const { userId, accessToken, refreshToken } = await authService.login(username, password);
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
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const { accessToken, refreshToken } = await authService.changePassword(
      req.userId!,
      currentPassword,
      newPassword,
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { username } = forgotPasswordSchema.parse(req.body);
    const frontendOrigin = env.corsOrigins[0];
    await authService.requestPasswordReset(
      username,
      (rawToken) => `${frontendOrigin}/reset-password?token=${rawToken}`,
    );
    // Always the same response, whether or not the account exists.
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
