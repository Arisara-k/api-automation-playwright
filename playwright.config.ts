import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60_000,
  testDir: "./testCases",
  globalSetup: "./plugins/globalSetup.ts",
  globalTeardown: "./plugins/globalTeardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["json", { outputFile: "./test-results/test-results.json" }], ["html", { open: "never" }]],
  use: {
    trace: "on-first-retry"
  }
});
