import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { getSpinState, spinWheel } from "../services/spinService.js";

export const spinRouter = Router();

spinRouter.use(requireAuth);

function serializeState(state: { enabled: boolean; canSpin: boolean; nextSpinAt: Date | null; segments: number[] }) {
  return { enabled: state.enabled, can_spin: state.canSpin, next_spin_at: state.nextSpinAt, segments: state.segments };
}

spinRouter.get(
  "/state",
  asyncHandler(async (req, res) => {
    res.json(serializeState(await getSpinState(req.userId!)));
  }),
);

spinRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await spinWheel(req.userId!);
    res.json({
      segment_index: result.segmentIndex,
      value: result.value,
      next_spin_at: result.nextSpinAt,
    });
  }),
);
