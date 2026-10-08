import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://user:pass@127.0.0.1:5432/vakilgram",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://user:pass@127.0.0.1:5432/vakilgram",
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-ci-only-not-for-production",
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_FEATURE_VOICE: "true",
      SITE_URL: "http://127.0.0.1:3000"
    }
  }
});
