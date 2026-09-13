import type { Response } from "express";
import { env } from "../config/env.js";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes; keep roughly in sync with JWT_ACCESS_EXPIRES_IN
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // Cross-site cookies (frontend on Netlify, API on its own domain) need
    // SameSite=None + Secure in production. Locally, over http, browsers
    // reject None cookies, so fall back to Lax (fine for same-site
    // localhost dev across ports).
    sameSite: env.isProduction ? ("none" as const) : ("lax" as const),
    maxAge: maxAgeMs,
    path: "/",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
}
