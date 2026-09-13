import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // server/ has its own vitest.config.ts and test suite (run via
    // `cd server && npm test`) — exclude it here so the frontend's jsdom
    // run doesn't also try to pick up its Node/Mongo tests.
    exclude: ["**/node_modules/**", "server/**"],
  },
});
