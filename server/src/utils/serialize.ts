import { Types } from "mongoose";

/**
 * Every model's `toJSON` transform below outputs the exact snake_case shape
 * (`id` instead of `_id`, `full_name` instead of `fullName`, etc.) that the
 * frontend's `src/types/database.ts` already expects — that type file used
 * to describe the Postgres/Supabase response shape, and rather than touch
 * every component that reads `round.dice_result` / `bet.selected_side` /
 * etc., this backend just serializes to match it. Request bodies (what the
 * frontend sends) are still plain camelCase — only responses go through
 * this adapter.
 */

/** Resolves an ObjectId ref (populated or not) down to a plain string id. */
export function idOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === "object" && "id" in (value as Record<string, unknown>)) {
    return (value as { id: string }).id;
  }
  return String(value);
}

/** True if a populated ref has already been turned into a plain object (not just an ObjectId). */
export function isPopulated(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !(value instanceof Types.ObjectId);
}
