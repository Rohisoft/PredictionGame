import { describe, expect, it } from "vitest";
import { betSchema } from "@/schemas/bet";

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
