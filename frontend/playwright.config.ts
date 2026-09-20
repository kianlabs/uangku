import { defineConfig, devices } from "@playwright/test";

/**
 * UangKu Playwright E2E config.
 *
 * Jalankan: npx playwright test
 * Atau via mise: mise run test:e2e
 *
 * Membutuhkan:
 *   - Backend running di :8000 (uv run uvicorn app.main:app --port 8000)
 *   - Database uangku_test sudah di-migrate (uv run alembic upgrade head)
 *   - ATAU jalankan `mise run dev` lalu `mise run test:e2e` di terminal terpisah
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential to avoid DB race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  // Dev server — reuse jika sudah running, start baru di CI
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
