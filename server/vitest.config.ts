import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // mongodb-memory-server spawns a real `mongod` child process; that
    // doesn't play well with Vitest's default worker_threads pool. `forks`
    // runs each test file in a real child process instead, like a plain
    // Node script (which is what actually works — see tests/diag.mjs).
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    setupFiles: [path.resolve(import.meta.dirname, "tests/setup.ts")],
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/test",
      JWT_ACCESS_SECRET: "test-access-secret-please-ignore",
      JWT_REFRESH_SECRET: "test-refresh-secret-please-ignore",
      NODE_ENV: "test",
    },
  },
});
