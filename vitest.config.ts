import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Slow Windows disk / AV-scanned I/O makes the default multi-worker pool's
    // RPC channel time out during module transform (each worker duplicates
    // resolution work, multiplying I/O contention). Running test files
    // sequentially in a single worker avoids that without masking real bugs.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // The real `server-only` package throws outside an RSC bundle; alias it
      // to a no-op so server modules (prompts, ai gateway, db) unit-test.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
});
