import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { WalletTransaction } from "../src/models/WalletTransaction.js";
import { SPIN_COOLDOWN_MS, SPIN_SEGMENTS } from "../src/config/constants.js";
import { getSpinState, isSpinEnabled, setSpinEnabled, spinWheel } from "../src/services/spinService.js";

async function makeUserWithWallet(balance = 0) {
  const username = `user${new mongoose.Types.ObjectId().toString()}`;
  const user = await User.create({ username, passwordHash: "x" });
  const wallet = await Wallet.create({ userId: user._id, balance });
  return { user, wallet };
}

describe("getSpinState", () => {
  it("allows a spin for a user who has never spun", async () => {
    const { user } = await makeUserWithWallet();
    const state = await getSpinState(user._id.toString());
    expect(state.canSpin).toBe(true);
    expect(state.nextSpinAt).toBeNull();
    expect(state.segments).toEqual(SPIN_SEGMENTS.map((s) => s.value));
  });

  it("blocks a spin within the cooldown and reports when it reopens", async () => {
    const { user } = await makeUserWithWallet();
    await User.findByIdAndUpdate(user._id, { lastSpinAt: new Date() });

    const state = await getSpinState(user._id.toString());
    expect(state.canSpin).toBe(false);
    expect(state.nextSpinAt).not.toBeNull();
    expect(state.nextSpinAt!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("spinWheel", () => {
  it("picks one of the configured segments and credits its value to the wallet", async () => {
    const { user, wallet } = await makeUserWithWallet(0);

    const result = await spinWheel(user._id.toString());

    expect(result.segmentIndex).toBeGreaterThanOrEqual(0);
    expect(result.segmentIndex).toBeLessThan(SPIN_SEGMENTS.length);
    expect(result.value).toBe(SPIN_SEGMENTS[result.segmentIndex].value);

    const refreshedWallet = await Wallet.findById(wallet._id);
    expect(refreshedWallet?.balance).toBe(result.value);

    const refreshedUser = await User.findById(user._id);
    expect(refreshedUser?.lastSpinAt).not.toBeNull();

    if (result.value > 0) {
      const tx = await WalletTransaction.findOne({ userId: user._id, transactionType: "bonus" });
      expect(tx?.amount).toBe(result.value);
      expect(tx?.description).toBe("Daily Spin & Win");
    } else {
      const tx = await WalletTransaction.findOne({ userId: user._id, transactionType: "bonus" });
      expect(tx).toBeNull();
    }
  });

  it("rejects a second spin before the cooldown elapses", async () => {
    const { user } = await makeUserWithWallet();
    await spinWheel(user._id.toString());

    await expect(spinWheel(user._id.toString())).rejects.toThrow(/already spun/);
  });

  it("allows a new spin once the cooldown has fully elapsed", async () => {
    const { user, wallet } = await makeUserWithWallet(0);
    // Simulate a spin from just past one cooldown window ago.
    await User.findByIdAndUpdate(user._id, {
      lastSpinAt: new Date(Date.now() - SPIN_COOLDOWN_MS - 1000),
    });

    const result = await spinWheel(user._id.toString());
    expect(result.value).toBeGreaterThanOrEqual(0);

    const refreshedWallet = await Wallet.findById(wallet._id);
    expect(refreshedWallet?.balance).toBe(result.value);
  });

  it("only lets one of two concurrent spins for the same user succeed", async () => {
    const { user } = await makeUserWithWallet();

    const results = await Promise.allSettled([
      spinWheel(user._id.toString()),
      spinWheel(user._id.toString()),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});

describe("Spin & Win on/off switch", () => {
  it("defaults to enabled when no settings document exists yet", async () => {
    expect(await isSpinEnabled()).toBe(true);
  });

  it("setSpinEnabled(false) blocks new spins and getSpinState reflects it", async () => {
    const { user } = await makeUserWithWallet();

    await setSpinEnabled(false);
    expect(await isSpinEnabled()).toBe(false);

    const state = await getSpinState(user._id.toString());
    expect(state.enabled).toBe(false);
    expect(state.canSpin).toBe(false);

    await expect(spinWheel(user._id.toString())).rejects.toThrow(/currently disabled/);

    // No spin was actually claimed while disabled — re-enabling immediately
    // still lets this same user spin.
    await setSpinEnabled(true);
    const result = await spinWheel(user._id.toString());
    expect(result.value).toBeGreaterThanOrEqual(0);
  });
});
