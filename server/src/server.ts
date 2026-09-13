import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";
import { createApp } from "./app.js";
import { startRoundScheduler } from "./jobs/roundScheduler.js";

async function main() {
  await connectDB();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  startRoundScheduler();
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
