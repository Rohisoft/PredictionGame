import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";
import { createApp } from "./app.js";
import { startRoundScheduler } from "./jobs/roundScheduler.js";

async function main() {
  await connectDB();

  const app = createApp();
  // Explicit 0.0.0.0 — inside a container, binding without a host can end
  // up unreachable from outside it even though it "works" locally, which
  // is exactly what leaves a host like Render unable to detect the port.
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`API listening on 0.0.0.0:${env.PORT}`);
  });

  startRoundScheduler();
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
