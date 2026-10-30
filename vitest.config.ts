import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    setupFiles: ["tests/setup/env.ts"],
    // Integration tests share one SQLite file, so files run one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
