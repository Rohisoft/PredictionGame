import { describe, expect, it } from "vitest";
import { User, type Role } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import {
  adminAdjustPoints,
  adminCreateUser,
  adminGetUserTransactions,
  adminListUsers,
  adminSetUserPassword,
  adminSuggestUsernames,
  superAdminAdjustAdminPoints,
  superAdminCreateAdmin,
  superAdminListAdmins,
} from "../src/services/adminService.js";
import { verifyPassword } from "../src/utils/password.js";

async function makeUser(
  username: string,
  { role = "user" as Role, balance = 100, createdBy = null as string | null } = {},
) {
  const user = await User.create({ username, passwordHash: "x", role, createdBy, fullName: "Test User" });
  const wallet = await Wallet.create({ userId: user._id, balance });
  return { user, wallet };
}

describe("adminCreateUser", () => {
  it("creates a player account owned by the calling admin, with the welcome bonus", async () => {
    const { user: admin } = await makeUser("admin1", { role: "admin" });

    const created = await adminCreateUser(admin._id.toString(), {
      username: "newperson",
      password: "initial-password1",
      fullName: "New Person",
    });
    expect(created?.username).toBe("newperson");

    const rawUser = await User.findOne({ username: "newperson" });
    expect(rawUser?.role).toBe("user");
    expect(String(rawUser?.createdBy)).toBe(admin._id.toString());
    expect(rawUser?.mustChangePassword).toBe(true);
    expect(await verifyPassword("initial-password1", rawUser!.passwordHash!)).toBe(true);

    const wallet = await Wallet.findOne({ userId: rawUser?._id });
    expect(wallet?.balance).toBe(100); // welcome bonus
  });

  it("rejects a non-admin caller", async () => {
    const { user: caller } = await makeUser("notadmin");
    await expect(
      adminCreateUser(caller._id.toString(), { username: "x", password: "password123", fullName: "X" }),
    ).rejects.toThrow(/Not authorized/);
  });

  it("rejects creating a user with a username that already exists", async () => {
    const { user: admin } = await makeUser("admin2", { role: "admin" });
    await makeUser("dupe");

    await expect(
      adminCreateUser(admin._id.toString(), { username: "dupe", password: "password123", fullName: "Dupe" }),
    ).rejects.toThrow(/already taken/);
  });
});

describe("superAdminCreateAdmin", () => {
  it("creates an admin account with 0 starting balance (no welcome bonus)", async () => {
    const { user: superadmin } = await makeUser("root1", { role: "superadmin" });

    const created = await superAdminCreateAdmin(superadmin._id.toString(), {
      username: "newadmin",
      password: "initial-password1",
      fullName: "New Admin",
    });
    expect(created?.username).toBe("newadmin");

    const rawUser = await User.findOne({ username: "newadmin" });
    expect(rawUser?.role).toBe("admin");
    expect(String(rawUser?.createdBy)).toBe(superadmin._id.toString());

    const wallet = await Wallet.findOne({ userId: rawUser?._id });
    expect(wallet?.balance).toBe(0);
  });

  it("rejects a plain admin caller — only superadmin can create admins", async () => {
    const { user: admin } = await makeUser("admin3", { role: "admin" });
    await expect(
      superAdminCreateAdmin(admin._id.toString(), { username: "x", password: "password123", fullName: "X" }),
    ).rejects.toThrow(/Not authorized/);
  });
});

describe("adminAdjustPoints (transfer between admin and a user they created)", () => {
  it("credits a user by deducting the same amount from the admin's own wallet", async () => {
    const { user: admin, wallet: adminWallet } = await makeUser("admin4", { role: "admin", balance: 200 });
    const { user: target, wallet: targetWallet } = await makeUser("creditme", {
      balance: 100,
      createdBy: admin._id.toString(),
    });

    await adminAdjustPoints(admin._id.toString(), target.username, 50, "bonus");

    expect((await Wallet.findById(adminWallet._id))?.balance).toBe(150);
    expect((await Wallet.findById(targetWallet._id))?.balance).toBe(150);

    const targetTx = await WalletTransaction.findOne({ userId: target._id });
    expect(targetTx).toMatchObject({ amount: 50, description: "bonus" });
    const adminTx = await WalletTransaction.findOne({ userId: admin._id });
    expect(adminTx).toMatchObject({ amount: -50 });
  });

  it("debits a user by crediting the same amount back to the admin", async () => {
    const { user: admin, wallet: adminWallet } = await makeUser("admin5", { role: "admin", balance: 200 });
    const { user: target, wallet: targetWallet } = await makeUser("debitme", {
      balance: 100,
      createdBy: admin._id.toString(),
    });

    await adminAdjustPoints(admin._id.toString(), target.username, -30);

    expect((await Wallet.findById(adminWallet._id))?.balance).toBe(230);
    expect((await Wallet.findById(targetWallet._id))?.balance).toBe(70);
  });

  it("rejects giving more than the admin's own balance", async () => {
    const { user: admin } = await makeUser("admin6", { role: "admin", balance: 10 });
    const { user: target } = await makeUser("hopeful", { balance: 0, createdBy: admin._id.toString() });

    await expect(adminAdjustPoints(admin._id.toString(), target.username, 50)).rejects.toThrow(
      /don't have enough points/,
    );
  });

  it("rejects a debit that would take the user's balance below zero", async () => {
    const { user: admin } = await makeUser("admin7", { role: "admin", balance: 200 });
    const { user: target } = await makeUser("poor", { balance: 20, createdBy: admin._id.toString() });

    await expect(adminAdjustPoints(admin._id.toString(), target.username, -50)).rejects.toThrow(
      /below zero/,
    );
  });

  it("rejects an admin adjusting their own balance", async () => {
    const { user: admin } = await makeUser("admin8", { role: "admin", balance: 200 });
    await expect(adminAdjustPoints(admin._id.toString(), admin.username, 10)).rejects.toThrow(
      /can't adjust your own balance/,
    );
  });

  it("rejects an admin adjusting a user they didn't create", async () => {
    const { user: admin } = await makeUser("admin9", { role: "admin", balance: 200 });
    const { user: someoneElsesUser } = await makeUser("notmine", { balance: 50, createdBy: "000000000000000000000000" });

    await expect(adminAdjustPoints(admin._id.toString(), someoneElsesUser.username, 10)).rejects.toThrow(
      /users you created/,
    );
  });

  it("rejects targeting an admin or superadmin account through this endpoint", async () => {
    const { user: admin } = await makeUser("admin10", { role: "admin", balance: 200 });
    const { user: otherAdmin } = await makeUser("admin11", { role: "admin", balance: 0 });

    await expect(adminAdjustPoints(admin._id.toString(), otherAdmin.username, 10)).rejects.toThrow(
      /player account/,
    );
  });

  it("rejects a zero amount", async () => {
    const { user: admin } = await makeUser("admin12", { role: "admin", balance: 200 });
    const { user: target } = await makeUser("target2", { createdBy: admin._id.toString() });

    await expect(adminAdjustPoints(admin._id.toString(), target.username, 0)).rejects.toThrow(
      /must not be zero/,
    );
  });

  it("lets a superadmin adjust any player's points regardless of who created them", async () => {
    const { user: superadmin, wallet: superadminWallet } = await makeUser("root2", {
      role: "superadmin",
      balance: 500,
    });
    const { user: someoneElsesUser, wallet: targetWallet } = await makeUser("anyonesuser", {
      balance: 50,
      createdBy: "000000000000000000000000",
    });

    await adminAdjustPoints(superadmin._id.toString(), someoneElsesUser.username, 20);

    expect((await Wallet.findById(superadminWallet._id))?.balance).toBe(480);
    expect((await Wallet.findById(targetWallet._id))?.balance).toBe(70);
  });
});

describe("superAdminAdjustAdminPoints (mint — no source deduction)", () => {
  it("credits an admin's wallet directly", async () => {
    const { user: superadmin } = await makeUser("root3", { role: "superadmin", balance: 0 });
    const { user: admin, wallet: adminWallet } = await makeUser("admin13", { role: "admin", balance: 0 });

    await superAdminAdjustAdminPoints(superadmin._id.toString(), admin.username, 300, "recharge");

    expect((await Wallet.findById(adminWallet._id))?.balance).toBe(300);
    // The superadmin's own balance is untouched — this is a mint, not a transfer.
    const superadminWallet = await Wallet.findOne({ userId: superadmin._id });
    expect(superadminWallet?.balance).toBe(0);

    const tx = await WalletTransaction.findOne({ userId: admin._id });
    expect(tx).toMatchObject({ amount: 300, description: "recharge" });
  });

  it("rejects a non-superadmin caller", async () => {
    const { user: admin } = await makeUser("admin14", { role: "admin" });
    const { user: otherAdmin } = await makeUser("admin15", { role: "admin" });
    await expect(
      superAdminAdjustAdminPoints(admin._id.toString(), otherAdmin.username, 100),
    ).rejects.toThrow(/Not authorized/);
  });

  it("rejects targeting a non-admin account", async () => {
    const { user: superadmin } = await makeUser("root4", { role: "superadmin" });
    const { user: player } = await makeUser("player1");
    await expect(
      superAdminAdjustAdminPoints(superadmin._id.toString(), player.username, 100),
    ).rejects.toThrow(/admin account/);
  });

  it("rejects a debit that would take the admin's balance below zero", async () => {
    const { user: superadmin } = await makeUser("root5", { role: "superadmin" });
    const { user: admin } = await makeUser("admin16", { role: "admin", balance: 10 });
    await expect(
      superAdminAdjustAdminPoints(superadmin._id.toString(), admin.username, -50),
    ).rejects.toThrow(/below zero/);
  });
});

describe("adminListUsers / superAdminListAdmins scoping", () => {
  it("an admin only sees players they created", async () => {
    const { user: admin } = await makeUser("admin17", { role: "admin" });
    const { user: otherAdmin } = await makeUser("admin18", { role: "admin" });
    await makeUser("mine1", { createdBy: admin._id.toString() });
    await makeUser("mine2", { createdBy: admin._id.toString() });
    await makeUser("notmine1", { createdBy: otherAdmin._id.toString() });

    const list = await adminListUsers(admin._id.toString(), undefined, 50);
    expect(list.map((u) => u.username).sort()).toEqual(["mine1", "mine2"]);
  });

  it("a superadmin sees every player regardless of creator", async () => {
    const { user: superadmin } = await makeUser("root6", { role: "superadmin" });
    const { user: admin } = await makeUser("admin19", { role: "admin" });
    await makeUser("someonesplayer", { createdBy: admin._id.toString() });

    const list = await adminListUsers(superadmin._id.toString(), undefined, 50);
    expect(list.map((u) => u.username)).toContain("someonesplayer");
  });

  it("superAdminListAdmins lists admin accounts only", async () => {
    const { user: superadmin } = await makeUser("root7", { role: "superadmin" });
    await makeUser("admin20", { role: "admin" });
    await makeUser("player2");

    const list = await superAdminListAdmins(superadmin._id.toString(), undefined, 50);
    expect(list.map((u) => u.username)).toEqual(["admin20"]);
  });
});

describe("adminGetUserTransactions ownership", () => {
  it("lets an admin view activity for a user they created", async () => {
    const { user: admin } = await makeUser("admin21", { role: "admin", balance: 200 });
    const { user: target } = await makeUser("history1", { createdBy: admin._id.toString() });

    await adminAdjustPoints(admin._id.toString(), target.username, 25, "top up");

    const history = await adminGetUserTransactions(admin._id.toString(), target._id.toString(), 20);
    expect(history.some((tx) => tx.description === "top up")).toBe(true);
  });

  it("rejects viewing a user the admin didn't create", async () => {
    const { user: admin } = await makeUser("admin22", { role: "admin" });
    const { user: notMine } = await makeUser("notmine2");

    await expect(adminGetUserTransactions(admin._id.toString(), notMine._id.toString(), 20)).rejects.toThrow(
      /users you created/,
    );
  });
});

describe("adminSuggestUsernames", () => {
  it("reports availability with no suggestions when the username is free", async () => {
    const { user: admin } = await makeUser("admin23", { role: "admin" });
    const result = await adminSuggestUsernames(admin._id.toString(), "freename");
    expect(result).toEqual({ available: true, suggestions: [] });
  });

  it("suggests available alternatives (including phone-based ones) when taken", async () => {
    const { user: admin } = await makeUser("admin24", { role: "admin" });
    await makeUser("taken");

    const result = await adminSuggestUsernames(admin._id.toString(), "taken", "+1 555-123-4567");
    expect(result.available).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions).toContain("taken4567");
  });

  it("rejects an invalid username shape", async () => {
    const { user: admin } = await makeUser("admin25", { role: "admin" });
    await expect(adminSuggestUsernames(admin._id.toString(), "a")).rejects.toThrow(/3-30 characters/);
  });
});

describe("adminSetUserPassword", () => {
  it("sets a new password, forces mustChangePassword, and signs out any session (own user)", async () => {
    const { user: admin } = await makeUser("admin26", { role: "admin" });
    const { user: target } = await makeUser("resetme", { createdBy: admin._id.toString() });
    target.mustChangePassword = false;
    target.refreshTokenHash = "old-session-hash";
    await target.save();

    await adminSetUserPassword(admin._id.toString(), "resetme", "brand-new-password1");

    const updated = await User.findById(target._id);
    expect(await verifyPassword("brand-new-password1", updated!.passwordHash!)).toBe(true);
    expect(updated?.mustChangePassword).toBe(true);
    expect(updated?.refreshTokenHash).toBeNull();
  });

  it("rejects resetting a user the admin didn't create", async () => {
    const { user: admin } = await makeUser("admin27", { role: "admin" });
    const { user: notMine } = await makeUser("notmine3");

    await expect(adminSetUserPassword(admin._id.toString(), notMine.username, "brand-new-password1")).rejects.toThrow(
      /users you created/,
    );
  });

  it("lets a superadmin reset anyone's password, including an admin's", async () => {
    const { user: superadmin } = await makeUser("root8", { role: "superadmin" });
    const { user: admin } = await makeUser("admin28", { role: "admin" });

    await adminSetUserPassword(superadmin._id.toString(), admin.username, "brand-new-password1");
    const updated = await User.findById(admin._id);
    expect(await verifyPassword("brand-new-password1", updated!.passwordHash!)).toBe(true);
  });

  it("rejects a non-existent username", async () => {
    const { user: admin } = await makeUser("admin29", { role: "admin" });
    await expect(
      adminSetUserPassword(admin._id.toString(), "nobody-here", "brand-new-password1"),
    ).rejects.toThrow(/No user found/);
  });
});
