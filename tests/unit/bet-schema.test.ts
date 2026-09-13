import { describe, expect, it } from "vitest";
import { betSchema, adminAddPointsSchema } from "@/schemas/bet";

describe("betSchema", () => {
  it("accepts each allowed stake amount", () => {
    for (const amount of [10, 20, 50, 100]) {
      const result = betSchema.safeParse({
        roundId: "11111111-1111-1111-1111-111111111111",
        selectedSide: "odd",
        amount,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a stake amount that isn't one of the predefined options", () => {
    const result = betSchema.safeParse({
      roundId: "11111111-1111-1111-1111-111111111111",
      selectedSide: "odd",
      amount: 25,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a side that isn't odd or even", () => {
    const result = betSchema.safeParse({
      roundId: "11111111-1111-1111-1111-111111111111",
      selectedSide: "high",
      amount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty round id", () => {
    const result = betSchema.safeParse({
      roundId: "",
      selectedSide: "odd",
      amount: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("adminAddPointsSchema", () => {
  it("accepts a positive amount and valid email", () => {
    const result = adminAddPointsSchema.safeParse({
      userEmail: "player@example.com",
      amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(adminAddPointsSchema.safeParse({ userEmail: "a@b.com", amount: 0 }).success).toBe(false);
    expect(adminAddPointsSchema.safeParse({ userEmail: "a@b.com", amount: -5 }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = adminAddPointsSchema.safeParse({ userEmail: "not-an-email", amount: 10 });
    expect(result.success).toBe(false);
  });
});
