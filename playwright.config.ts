import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnvFile } from "./tests/e2e/helpers/load-env";

loadLocalEnvFile();

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "pt-BR",
  },
  projects: [
    {
      name: "chromium",
      testIgnore:
        /mobile-(storefront|counter-order|admin-new-order-notifications)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      testMatch:
        /mobile-(storefront|counter-order|admin-new-order-notifications)\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
