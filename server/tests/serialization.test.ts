import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { GameRound } from "../src/models/GameRound.js";
import { Bet } from "../src/models/Bet.js";
import { getMyBetHistory } from "../src/services/betService.js";

/**
 * The frontend's existing components read snake_case fields (dice_result,
 * selected_side, game_rounds, ...) left over from the Postgres/Supabase
 * version. These tests pin down that the Mongo models' toJSON transforms
 * actually produce that exact shape, since nothing else in this repo
 * would catch a regression here (the frontend hasn't been wired up yet).
 */

describe("JSON serialization shape", () => {
  it("User -> profile shape, never leaks passwordHash", async () => {
    const user = await User.create({
      username: "shapetest",
      email: "shape@test.local",
      passwordHash: "secret-hash",
      fullName: "Shape Test",
    });
    const json = user.toJSON();

    expect(json).toMatchObject({
      id: expect.any(String),
      username: "shapetest",
      full_name: "Shape Test",
      email: "shape@test.local",
      is_admin: false,
      must_change_password: true,
    });
    expect(json).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("_id");
  });

  it("Wallet -> user_id/balance shape", async () => {
    const user = await User.create({ username: "wallettest", passwordHash: "x" });
    const wallet = await Wallet.create({ userId: user._id, balance: 42 });
    const json = wallet.toJSON();

    expect(json).toEqual({
      id: wallet._id.toString(),
      user_id: user._id.toString(),
      balance: 42,
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    });
  });

  it("GameRound -> round_number/dice_result/winning_side shape", async () => {
    const round = await GameRound.create({
      roundNumber: 1,
      status: "completed",
      bettingStartTime: new Date(),
      bettingEndTime: new Date(),
      resultTime: new Date(),
      diceResult: 4,
      winningSide: "even",
      completedAt: new Date(),
    });
    const json = round.toJSON();

    expect(json).toMatchObject({ round_number: 1, status: "completed", dice_result: 4, winning_side: "even" });
  });

  it("Bet -> selected_side/payout_amount shape, with nested game_rounds when the round is populated", async () => {
    const user = await User.create({ username: "bettest", passwordHash: "x" });
    const round = await GameRound.create({
      roundNumber: 2,
      status: "completed",
      bettingStartTime: new Date(),
      bettingEndTime: new Date(),
      resultTime: new Date(),
      diceResult: 3,
      winningSide: "odd",
      completedAt: new Date(),
    });
    await Bet.create({
      userId: user._id,
      roundId: round._id,
      selectedSide: "odd",
      amount: 20,
      status: "won",
      payoutAmount: 40,
      settledAt: new Date(),
    });

    const [historyBet] = await getMyBetHistory(user._id.toString());
    const json = historyBet.toJSON();

    expect(json).toMatchObject({ selected_side: "odd", amount: 20, status: "won", payout_amount: 40 });
    expect(json.game_rounds).toMatchObject({ round_number: 2, dice_result: 3, winning_side: "odd", status: "completed" });
    expect(json).not.toHaveProperty("roundId");
  });
});
