import cron from "node-cron";
import { tickRounds } from "../services/gameService.js";
import { tickColorRounds } from "../services/colorGameService.js";
import { tickTeenPattiRounds } from "../services/teenPattiGameService.js";

let running = false;

async function tick() {
  await Promise.all([
    tickRounds().catch((err) => console.error("tickRounds failed:", err)),
    tickColorRounds().catch((err) => console.error("tickColorRounds failed:", err)),
    tickTeenPattiRounds().catch((err) => console.error("tickTeenPattiRounds failed:", err)),
  ]);
}

/**
 * Runs both games' tick functions every minute. Guards against overlapping
 * runs (e.g. if a tick takes unexpectedly long) with a simple in-process
 * flag — fine for a single-instance deployment; running more than one
 * instance of this process would need a distributed lock instead.
 *
 * Each tick*Rounds() always settles whatever round is already in flight for
 * its own game, but only opens a new one while that game's own on/off
 * switch is on — see gameService.ts / colorGameService.ts /
 * teenPattiGameService.ts.
 */
export function startRoundScheduler() {
  const task = cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await tick();
    } finally {
      running = false;
    }
  });

  // Seed the very first round of each game immediately instead of waiting
  // up to 60s.
  tick();

  return task;
}
