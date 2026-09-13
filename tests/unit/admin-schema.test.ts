import { describe, expect, it } from "vitest";
import { adminAdjustPointsSchema } from "@/schemas/admin";

describe("adminAdjustPointsSchema", () => {
  it("accepts a positive amount (credit) and a valid email", () => {
    const result = adminAdjustPointsSchema.safeParse({
      userEmail: "player@example.com",
      amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a negative amount (debit)", () => {
    const result = adminAdjustPointsSchema.safeParse({
      userEmail: "player@example.com",
      amount: -25,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    expect(adminAdjustPointsSchema.safeParse({ userEmail: "a@b.com", amount: 0 }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = adminAdjustPointsSchema.safeParse({ userEmail: "not-an-email", amount: 10 });
    expect(result.success).toBe(false);
  });
});
