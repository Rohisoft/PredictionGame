import type { ErrorRequestHandler } from "express";
import { HttpError } from "../utils/asyncHandler.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Mongo duplicate-key error (e.g. a second bet on the same round).
  if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
    res.status(409).json({ error: "That record already exists" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
