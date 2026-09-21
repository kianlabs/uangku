/**
 * E2E: Export CSV flow
 *
 * Covers: buat transaksi → export CSV mengunduh file.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";
import { submitTransaksi } from "./helpers/forms";

let sharedEmail: string;

test.describe("Export", () => {
  test.beforeAll(async ({ browser }) => {
    // Batas rate-limit server (5x/menit) + retry 65 dtk di helper
    // butuh hook timeout lebih panjang dari default 30 dtk.
    test.setTimeout(180_000);
    sharedEmail = uniqueEmail();
    const page = await browser.newPage();
    await registerAndLogin(page, sharedEmail);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(sharedEmail);
    await page.getByLabel("Password", { exact: true }).fill("testpass1234");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });
  });

  test("unduh CSV setelah ada transaksi", async ({ page }) => {
    // Pastikan ada minimal 1 transaksi
    await page.goto("/transaksi/tambah");
    await page.getByLabel("Nominal").fill("25000");
    const categorySelect = page.getByLabel("Kategori");
    await categorySelect.waitFor({ state: "attached" });
    const firstOption = categorySelect.locator("option").nth(1);
    await categorySelect.selectOption((await firstOption.getAttribute("value")) ?? "");
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await page.getByLabel("Tanggal").fill(today);
    await submitTransaksi(page);

    await page.goto("/akun/export-data");
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: "Unduh CSV" }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
