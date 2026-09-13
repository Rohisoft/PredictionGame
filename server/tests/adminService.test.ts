import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import { adminAdjustPoints, adminGetUserTransactions, adminListUsers } from "../src/services/adminService.js";

async function makeUser(email: string, { isAdmin = false, balance = 100 } = {}) {
  const user = await User.create({ email, passwordHash: "x", isAdmin, fullName: "Test User" });
  const wallet = await Wallet.create({ userId: user._id, balance });
  return { user, wallet };
}

describe("adminListUsers", () => {
  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("plain@test.local");
    await expect(adminListUsers(caller._id.toString(), undefined, 50)).rejects.toThrow(/Not authorized/);
  });

  it("lists users with their wallet balance, filtered by search", async () => {
    const { user: admin } = await makeUser("admin@test.local", { isAdmin: true });
    await makeUser("alice@test.local", { balance: 250 });
    await makeUser("bob@test.local", { balance: 40 });

    const all = await adminListUsers(admin._id.toString(), undefined, 50);
    expect(all).toHaveLength(3);

    const filtered = await adminListUsers(admin._id.toString(), "alice", 50);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({ email: "alice@test.local", balance: 250 });
  });
});

describe("adminAdjustPoints", () => {
  it("credits a user when amount is positive", async () => {
    const { user: admin } = await makeUser("admin2@test.local", { isAdmin: true });
    const { user: target, wallet } = await makeUser("credit-me@test.local", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.email, 50, "bonus");

    const updated = await Wallet.findById(wallet._id);
    expect(updated?.balance).toBe(150);

    const tx = await WalletTransaction.findOne({ userId: target._id });
    expect(tx).toMatchObject({ amount: 50, description: "bonus" });
  });

  it("debits a user when amount is negative", async () => {
    const { user: admin } = await makeUser("admin3@test.local", { isAdmin: true });
    const { user: target, wallet } = await makeUser("debit-me@test.local", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.email, -30);

    const updated = await Wallet.findById(wallet._id);
    expect(updated?.balance).toBe(70);
  });

  it("rejects a debit that would take the balance below zero", async () => {
    const { user: admin } = await makeUser("admin4@test.local", { isAdmin: true });
    const { user: target } = await makeUser("poor@test.local", { balance: 20 });

    await expect(adminAdjustPoints(admin._id.toString(), target.email, -50)).rejects.toThrow(
      /below zero/,
    );
  });

  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("notadmin@test.local");
    const { user: target } = await makeUser("target@test.local");

    await expect(adminAdjustPoints(caller._id.toString(), target.email, 10)).rejects.toThrow(
      /Not authorized/,
    );
  });

  it("rejects a zero amount", async () => {
    const { user: admin } = await makeUser("admin5@test.local", { isAdmin: true });
    const { user: target } = await makeUser("target2@test.local");

    await expect(adminAdjustPoints(admin._id.toString(), target.email, 0)).rejects.toThrow(
      /must not be zero/,
    );
  });
});

describe("adminGetUserTransactions", () => {
  it("returns a target user's transaction history for an admin caller", async () => {
    const { user: admin } = await makeUser("admin6@test.local", { isAdmin: true });
    const { user: target } = await makeUser("history@test.local", { balance: 100 });

    await adminAdjustPoints(admin._id.toString(), target.email, 25, "top up");

    const history = await adminGetUserTransactions(admin._id.toString(), target._id.toString(), 20);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ amount: 25, description: "top up" });
  });
});
