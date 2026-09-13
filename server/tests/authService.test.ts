import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import * as authService from "../src/services/authService.js";
import { hashPassword } from "../src/utils/password.js";
import { WELCOME_BONUS } from "../src/config/constants.js";

describe("createUserAccount", () => {
  it("creates a user, a wallet with the welcome bonus, and a transaction record", async () => {
    const userId = await authService.createUserAccount("player@test.local", "Player One", null);

    const user = await User.findById(userId);
    expect(user?.email).toBe("player@test.local");
    expect(user?.passwordHash).toBeNull();

    const wallet = await Wallet.findOne({ userId });
    expect(wallet?.balance).toBe(WELCOME_BONUS);

    const tx = await WalletTransaction.findOne({ userId });
    expect(tx?.transactionType).toBe("adjustment");
    expect(tx?.amount).toBe(WELCOME_BONUS);
  });

  it("rejects a duplicate email", async () => {
    await authService.createUserAccount("dup@test.local", "First", null);
    await expect(authService.createUserAccount("dup@test.local", "Second", null)).rejects.toThrow(
      /already exists/,
    );
  });
});

describe("login", () => {
  it("succeeds with correct credentials and fails with a wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    await authService.createUserAccount("login@test.local", "Login Test", passwordHash);

    const { userId } = await authService.login("login@test.local", "correct-password");
    expect(userId).toBeTruthy();

    await expect(authService.login("login@test.local", "wrong-password")).rejects.toThrow(
      /Invalid email or password/,
    );
  });

  it("fails for a non-existent email", async () => {
    await expect(authService.login("nobody@test.local", "whatever")).rejects.toThrow(
      /Invalid email or password/,
    );
  });

  it("rejects login for an account that hasn't set a password yet", async () => {
    await authService.createUserAccount("pending@test.local", "Pending User", null);

    await expect(authService.login("pending@test.local", "anything")).rejects.toThrow(
      /doesn't have a password yet/,
    );
  });
});

describe("password reset / first-time activation", () => {
  it("lets an admin-created account (no password) set one via the reset flow", async () => {
    await authService.createUserAccount("activate@test.local", "Activate Me", null);

    let capturedUrl = "";
    await authService.requestPasswordReset("activate@test.local", (rawToken) => {
      capturedUrl = `https://app.example.com/reset-password?token=${rawToken}`;
      return capturedUrl;
    });

    const token = new URL(capturedUrl).searchParams.get("token")!;
    await authService.resetPassword(token, "my-new-password");

    const { userId } = await authService.login("activate@test.local", "my-new-password");
    expect(userId).toBeTruthy();
  });

  it("resets an existing password using the emailed token and invalidates the old one", async () => {
    const passwordHash = await hashPassword("old-password");
    await authService.createUserAccount("reset@test.local", "Reset Test", passwordHash);

    let capturedUrl = "";
    await authService.requestPasswordReset("reset@test.local", (rawToken) => {
      capturedUrl = `https://app.example.com/reset-password?token=${rawToken}`;
      return capturedUrl;
    });

    const token = new URL(capturedUrl).searchParams.get("token")!;
    await authService.resetPassword(token, "new-password");

    await expect(authService.login("reset@test.local", "old-password")).rejects.toThrow();
    const { userId } = await authService.login("reset@test.local", "new-password");
    expect(userId).toBeTruthy();
  });

  it("rejects an invalid reset token", async () => {
    await expect(authService.resetPassword("not-a-real-token", "new-password")).rejects.toThrow(
      /invalid or has expired/,
    );
  });
});
