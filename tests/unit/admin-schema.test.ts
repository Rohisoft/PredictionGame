import { describe, expect, it } from "vitest";
import { adminAdjustPointsSchema, adminCreateUserSchema } from "@/schemas/admin";

describe("adminAdjustPointsSchema", () => {
  it("accepts a positive amount (credit) and a valid username", () => {
    const result = adminAdjustPointsSchema.safeParse({
      username: "player1",
      amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a negative amount (debit)", () => {
    const result = adminAdjustPointsSchema.safeParse({
      username: "player1",
      amount: -25,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    expect(adminAdjustPointsSchema.safeParse({ username: "player1", amount: 0 }).success).toBe(false);
  });

  it("rejects an invalid username", () => {
    const result = adminAdjustPointsSchema.safeParse({ username: "a", amount: 10 });
    expect(result.success).toBe(false);
  });
});

describe("adminCreateUserSchema", () => {
  const base = {
    username: "newperson",
    password: "password123",
    fullName: "New Person",
  };

  it("accepts a minimal valid account (no email/phone)", () => {
    expect(adminCreateUserSchema.safeParse(base).success).toBe(true);
  });

  it("accepts optional email and phone when provided", () => {
    const result = adminCreateUserSchema.safeParse({
      ...base,
      email: "new@example.com",
      phone: "+1 555 0100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(adminCreateUserSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
  });

  it("rejects a malformed username", () => {
    expect(adminCreateUserSchema.safeParse({ ...base, username: "a" }).success).toBe(false);
    expect(adminCreateUserSchema.safeParse({ ...base, username: "has space" }).success).toBe(false);
  });
});
