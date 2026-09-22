/**
 * E2E: Landing page (/) untuk pengunjung baru.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing", () => {
  test("menampilkan headline dan CTA", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /catat yang masuk/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Mulai gratis" })
    ).toBeVisible();
  });

  test("CTA mengarah ke pendaftaran", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Mulai gratis" }).click();
    await expect(page).toHaveURL(/\/daftar/, { timeout: 10_000 });
  });
});
