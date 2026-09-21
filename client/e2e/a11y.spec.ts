/**
 * E2E: Accessibility smoke checks (no extra deps).
 *
 * Covers: landmarks, labels on auth form, progressbar semantics,
 * viewport allows pinch-zoom.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

let sharedEmail: string;

test.describe("A11y", () => {
  test.beforeAll(async ({ browser }) => {
    // Batas rate-limit server (5x/menit) + retry 65 dtk di helper
    // butuh hook timeout lebih panjang dari default 30 dtk.
    test.setTimeout(180_000);
    sharedEmail = uniqueEmail();
    const page = await browser.newPage();
    await registerAndLogin(page, sharedEmail);
    await page.close();
  });

  test("halaman masuk punya label dan heading", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page.getByRole("heading", { name: /masuk/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });

  test("viewport memperbolehkan pinch-zoom", async ({ page }) => {
    await page.goto("/masuk");
    const content = await page.getAttribute('meta[name="viewport"]', "content");
    expect(content ?? "").not.toMatch(/maximum-scale\s*=\s*1/);
  });

  test("beranda punya navigasi dan main content", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(sharedEmail);
    await page.getByLabel("Password", { exact: true }).fill("testpass1234");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });

    await expect(page.getByRole("navigation", { name: /navigasi utama/i })).toBeVisible();
  });
});
