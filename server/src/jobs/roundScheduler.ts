import cron from "node-cron";
import { tickRounds } from "../services/gameService.js";

let running = false;

/**
 * Runs tickRounds() every minute. Guards against overlapping runs (e.g. if
 * a tick takes unexpectedly long) with a simple in-process flag — fine for
 * a single-instance deployment; running more than one instance of this
 * process would need a distributed lock instead.
 */
export function startRoundScheduler() {
  const task = cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await tickRounds();
    } catch (err) {
      console.error("tickRounds failed:", err);
    } finally {
      running = false;
    }
  });

  // Seed the very first round immediately instead of waiting up to 60s.
  tickRounds().catch((err) => console.error("initial tickRounds failed:", err));

  return task;
}
