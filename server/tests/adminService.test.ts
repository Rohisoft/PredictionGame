import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import {
  adminAdjustPoints,
  adminCreateUser,
  adminGetUserTransactions,
  adminListUsers,
  adminSetUserPassword,
  adminSuggestUsernames,
} from "../src/services/adminService.js";
import { verifyPassword } from "../src/utils/password.js";

async function makeUser(username: string, { isAdmin = false, balance = 100 } = {}) {
  const user = await User.create({ username, passwordHash: "x", isAdmin, fullName: "Test User" });
  const wallet = await Wallet.create({ userId: user._id, balance });
  return { user, wallet };
}

describe("adminListUsers", () => {
  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("plain");
    await expect(adminListUsers(caller._id.toString(), undefined, 50)).rejects.toThrow(/Not authorized/);
  });

  it("lists users with their wallet balance, filtered by search", async () => {
    const { user: admin } = await makeUser("admin1", { isAdmin: true });
    await makeUser("alice", { balance: 250 });
    await makeUser("bob", { balance: 40 });

    const all = await adminListUsers(admin._id.toString(), undefined, 50);
    expect(all).toHaveLength(3);

    const filtered = await adminListUsers(admin._id.toString(), "alice", 50);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({ username: "alice", balance: 250 });
  });
});

describe("adminAdjustPoints", () => {
  it("credits a user when amount is positive", async () => {
    const { user: admin } = await makeUser("admin2", { isAdmin: true });
    const { user: target, wallet } = await makeUser("creditme", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.username, 50, "bonus");

    const updated = await Wallet.findById(wallet._id);
    expect(updated?.balance).toBe(150);

    const tx = await WalletTransaction.findOne({ userId: target._id });
    expect(tx).toMatchObject({ amount: 50, description: "bonus" });
  });

  it("debits a user when amount is negative", async () => {
    const { user: admin } = await makeUser("admin3", { isAdmin: true });
    const { user: target, wallet } = await makeUser("debitme", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.username, -30);

    const updated = await Wallet.findById(wallet._id);
    expect(updated?.balance).toBe(70);
  });

  it("rejects a debit that would take the balance below zero", async () => {
    const { user: admin } = await makeUser("admin4", { isAdmin: true });
    const { user: target } = await makeUser("poor", { balance: 20 });

    await expect(adminAdjustPoints(admin._id.toString(), target.username, -50)).rejects.toThrow(
      /below zero/,
    );
  });

  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("notadmin");
    const { user: target } = await makeUser("target1");

    await expect(adminAdjustPoints(caller._id.toString(), target.username, 10)).rejects.toThrow(
      /Not authorized/,
    );
  });

  it("rejects a zero amount", async () => {
    const { user: admin } = await makeUser("admin5", { isAdmin: true });
    const { user: target } = await makeUser("target2");

    await expect(adminAdjustPoints(admin._id.toString(), target.username, 0)).rejects.toThrow(
      /must not be zero/,
    );
  });
});

describe("adminGetUserTransactions", () => {
  it("returns a target user's transaction history for an admin caller", async () => {
    const { user: admin } = await makeUser("admin6", { isAdmin: true });
    const { user: target } = await makeUser("history", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.username, 25, "top up");

    const history = await adminGetUserTransactions(admin._id.toString(), target._id.toString(), 20);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ amount: 25, description: "top up" });
  });
});

describe("adminCreateUser", () => {
  it("creates a user with the given initial password (mustChangePassword true) and the welcome bonus", async () => {
    const { user: admin } = await makeUser("admin7", { isAdmin: true });

    const created = await adminCreateUser(admin._id.toString(), {
      username: "newperson",
      password: "initial-password1",
      fullName: "New Person",
      email: "newperson@test.local",
      phone: "+1 555-0100",
    });
    expect(created?.username).toBe("newperson");

    const rawUser = await User.findOne({ username: "newperson" });
    expect(rawUser?.passwordHash).toBeTruthy();
    expect(rawUser?.mustChangePassword).toBe(true);
    expect(await verifyPassword("initial-password1", rawUser!.passwordHash!)).toBe(true);
    expect(rawUser?.phone).toBe("+1 555-0100");

    const wallet = await Wallet.findOne({ userId: rawUser?._id });
    expect(wallet?.balance).toBe(100);
  });

  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("notadmin2");
    await expect(
      adminCreateUser(caller._id.toString(), { username: "x", password: "password123", fullName: "X" }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("rejects creating a user with a username that already exists", async () => {
    const { user: admin } = await makeUser("admin8", { isAdmin: true });
    await makeUser("dupe");

    await expect(
      adminCreateUser(admin._id.toString(), { username: "dupe", password: "password123", fullName: "Dupe" }),
    ).rejects.toThrow(/already taken/);
  });
});

describe("adminSuggestUsernames", () => {
  it("reports availability with no suggestions when the username is free", async () => {
    const { user: admin } = await makeUser("admin9", { isAdmin: true });
    const result = await adminSuggestUsernames(admin._id.toString(), "freename");
    expect(result).toEqual({ available: true, suggestions: [] });
  });

  it("suggests available alternatives (including phone-based ones) when taken", async () => {
    const { user: admin } = await makeUser("admin10", { isAdmin: true });
    await makeUser("taken");

    const result = await adminSuggestUsernames(admin._id.toString(), "taken", "+1 555-123-4567");
    expect(result.available).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions).toContain("taken4567");
  });

  it("rejects an invalid username shape", async () => {
    const { user: admin } = await makeUser("admin11", { isAdmin: true });
    await expect(adminSuggestUsernames(admin._id.toString(), "a")).rejects.toThrow(/3-30 characters/);
  });
});

describe("adminSetUserPassword", () => {
  it("sets a new password, forces mustChangePassword, and signs out any session", async () => {
    const { user: admin } = await makeUser("admin12", { isAdmin: true });
    const { user: target } = await makeUser("resetme");
    target.mustChangePassword = false;
    target.refreshTokenHash = "old-session-hash";
    await target.save();

    await adminSetUserPassword(admin._id.toString(), "resetme", "brand-new-password1");

    const updated = await User.findById(target._id);
    expect(await verifyPassword("brand-new-password1", updated!.passwordHash!)).toBe(true);
    expect(updated?.mustChangePassword).toBe(true);
    expect(updated?.refreshTokenHash).toBeNull();
  });

  it("rejects a non-existent username", async () => {
    const { user: admin } = await makeUser("admin13", { isAdmin: true });
    await expect(
      adminSetUserPassword(admin._id.toString(), "nobody-here", "brand-new-password1"),
    ).rejects.toThrow(/No user found/);
  });
});
