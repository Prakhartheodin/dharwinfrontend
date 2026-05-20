import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/taskboard",
  retries: 1,
  use: { baseURL: "http://localhost:3001", trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
