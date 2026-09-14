import { Schema, model } from "mongoose";

// Singleton document (_id is always the fixed string below) holding global
// game state that isn't tied to any one round — currently just whether an
// admin has the game switched on. tickRounds() only opens new rounds while
// this is true; it still settles whatever round is already in flight
// either way, so bets already placed are never left unresolved.
const SINGLETON_ID = "singleton";

const gameSettingsSchema = new Schema({
  _id: { type: String, default: SINGLETON_ID },
  isGameRunning: { type: Boolean, required: true, default: true },
  // Superadmin-only switch for the Spin & Win daily bonus wheel.
  isSpinEnabled: { type: Boolean, required: true, default: true },
  // Superadmin-only switch for the Color Prediction game.
  isColorGameEnabled: { type: Boolean, required: true, default: true },
});

gameSettingsSchema.set("toJSON", {
  transform(_doc, ret) {
    return {
      is_game_running: ret.isGameRunning,
      is_spin_enabled: ret.isSpinEnabled,
      is_color_game_enabled: ret.isColorGameEnabled,
    };
  },
});

export const GameSettings = model("GameSettings", gameSettingsSchema);
export { SINGLETON_ID as GAME_SETTINGS_ID };
