import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, resetPasswordSchema } from "@/schemas/auth";

describe("loginSchema", () => {
  it("requires a valid username and a non-empty password", () => {
    expect(loginSchema.safeParse({ username: "janedoe", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ username: "j", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "jane doe!", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ username: "janedoe", password: "" }).success).toBe(false);
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

describe("changePasswordSchema", () => {
  it("rejects mismatched new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "newpassword1",
      confirmPassword: "newpassword2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  it("requires a non-empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(false);
  });
});
