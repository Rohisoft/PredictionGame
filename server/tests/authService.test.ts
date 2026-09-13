import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import * as authService from "../src/services/authService.js";
import { WELCOME_BONUS } from "../src/config/constants.js";

describe("signup", () => {
  it("creates a user, a wallet with the welcome bonus, and a transaction record", async () => {
    const { userId } = await authService.signup("player@test.local", "password123", "Player One");

    const user = await User.findById(userId);
    expect(user?.email).toBe("player@test.local");

    const wallet = await Wallet.findOne({ userId });
    expect(wallet?.balance).toBe(WELCOME_BONUS);

    const tx = await WalletTransaction.findOne({ userId });
    expect(tx?.transactionType).toBe("adjustment");
    expect(tx?.amount).toBe(WELCOME_BONUS);
  });

  it("rejects a duplicate email", async () => {
    await authService.signup("dup@test.local", "password123", "First");
    await expect(authService.signup("dup@test.local", "password123", "Second")).rejects.toThrow(
      /already exists/,
    );
  });
});

describe("login", () => {
  it("succeeds with correct credentials and fails with a wrong password", async () => {
    await authService.signup("login@test.local", "correct-password", "Login Test");

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
});

describe("password reset", () => {
  it("resets the password using the emailed token and invalidates the old password", async () => {
    await authService.signup("reset@test.local", "old-password", "Reset Test");

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
