import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import * as authService from "../src/services/authService.js";
import { hashPassword } from "../src/utils/password.js";
import { WELCOME_BONUS } from "../src/config/constants.js";

async function makeAccount(username: string, password: string, overrides: Partial<Parameters<typeof authService.createUserAccount>[0]> = {}) {
  const passwordHash = await hashPassword(password);
  return authService.createUserAccount({ username, fullName: "Test User", passwordHash, ...overrides });
}

describe("createUserAccount", () => {
  it("creates a user (with the admin-set password and mustChangePassword true), a wallet with the welcome bonus, and a transaction record", async () => {
    const userId = await makeAccount("playerone", "initial-pass1");

    const user = await User.findById(userId);
    expect(user?.username).toBe("playerone");
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.mustChangePassword).toBe(true);

    const wallet = await Wallet.findOne({ userId });
    expect(wallet?.balance).toBe(WELCOME_BONUS);

    const tx = await WalletTransaction.findOne({ userId });
    expect(tx?.transactionType).toBe("adjustment");
    expect(tx?.amount).toBe(WELCOME_BONUS);
  });

  it("rejects a duplicate username", async () => {
    await makeAccount("dupuser", "password123");
    await expect(makeAccount("dupuser", "password123")).rejects.toThrow(/already taken/);
  });

  it("rejects a duplicate email when one is provided", async () => {
    await makeAccount("first", "password123", { email: "dup@test.local" });
    await expect(makeAccount("second", "password123", { email: "dup@test.local" })).rejects.toThrow(
      /already exists/,
    );
  });
});

describe("login", () => {
  it("succeeds with correct credentials and fails with a wrong password", async () => {
    await makeAccount("loginuser", "correct-password");

    const { userId } = await authService.login("loginuser", "correct-password");
    expect(userId).toBeTruthy();

    await expect(authService.login("loginuser", "wrong-password")).rejects.toThrow(
      /Invalid username or password/,
    );
  });

  it("fails for a non-existent username", async () => {
    await expect(authService.login("nobody", "whatever")).rejects.toThrow(/Invalid username or password/);
  });
});

describe("changePassword", () => {
  it("changes the password and clears mustChangePassword", async () => {
    const userId = await makeAccount("changeuser", "old-password");

    const tokens = await authService.changePassword(userId, "old-password", "brand-new-password");
    expect(tokens.accessToken).toBeTruthy();

    const user = await User.findById(userId);
    expect(user?.mustChangePassword).toBe(false);

    await expect(authService.login("changeuser", "old-password")).rejects.toThrow();
    const { userId: loggedInId } = await authService.login("changeuser", "brand-new-password");
    expect(loggedInId).toBe(userId);
  });

  it("rejects an incorrect current password", async () => {
    const userId = await makeAccount("changeuser2", "old-password");
    await expect(authService.changePassword(userId, "wrong-current", "new-password")).rejects.toThrow(
      /Current password is incorrect/,
    );
  });
});

describe("password reset (recovery)", () => {
  it("resets the password using the reset token and invalidates the old one", async () => {
    await makeAccount("resetuser", "old-password");

    let capturedUrl = "";
    await authService.requestPasswordReset("resetuser", (rawToken) => {
      capturedUrl = `https://app.example.com/reset-password?token=${rawToken}`;
      return capturedUrl;
    });

    const token = new URL(capturedUrl).searchParams.get("token")!;
    await authService.resetPassword(token, "new-password");

    await expect(authService.login("resetuser", "old-password")).rejects.toThrow();
    const { userId } = await authService.login("resetuser", "new-password");
    expect(userId).toBeTruthy();
  });

  it("rejects an invalid reset token", async () => {
    await expect(authService.resetPassword("not-a-real-token", "new-password")).rejects.toThrow(
      /invalid or has expired/,
    );
  });
});
