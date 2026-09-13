import { describe, expect, it } from "vitest";
import { loginSchema, resetPasswordSchema, signupSchema } from "@/schemas/auth";

describe("signupSchema", () => {
  const base = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    password: "supersecret1",
    confirmPassword: "supersecret1",
    ageConfirmed: true as const,
  };

  it("accepts a fully valid signup", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({ ...base, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({ ...base, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects signup when the age confirmation checkbox is unchecked", () => {
    const result = signupSchema.safeParse({ ...base, ageConfirmed: false });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a valid email and a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects mismatched new passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newpassword1",
      confirmPassword: "newpassword2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching passwords of sufficient length", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });
});
