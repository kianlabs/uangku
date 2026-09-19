/**
 * E2E: Transaction filter flows
 *
 * Covers: filter by type (income/expense), filter reset.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

let sharedEmail: string;

test.describe("Filter Transaksi", () => {
  test.beforeAll(async ({ browser }) => {
    sharedEmail = uniqueEmail();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await registerAndLogin(page, sharedEmail);

    // Seed: 1 income + 2 expense
    const today = todayISO();

    // Income
    await page.goto("/transaksi/tambah");
    await page.getByRole("button", { name: "Pemasukan" }).click();
    await page.getByLabel("Nominal").fill("2000000");
    await (await waitCategory(page)).selectOption(await firstCatValue(page));
    await page.getByLabel("Tanggal").fill(today);
    await page.getByLabel("Catatan").fill("filter-income-seed");
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();
    await page.waitForURL("**/beranda", { timeout: 10_000 });

    // Expense 1
    await page.goto("/transaksi/tambah");
    await page.getByLabel("Nominal").fill("50000");
    await (await waitCategory(page)).selectOption(await firstCatValue(page));
    await page.getByLabel("Tanggal").fill(today);
    await page.getByLabel("Catatan").fill("filter-expense-seed-1");
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();
    await page.waitForURL("**/beranda", { timeout: 10_000 });

    // Expense 2
    await page.goto("/transaksi/tambah");
    await page.getByLabel("Nominal").fill("75000");
    await (await waitCategory(page)).selectOption(await firstCatValue(page));
    await page.getByLabel("Tanggal").fill(today);
    await page.getByLabel("Catatan").fill("filter-expense-seed-2");
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();
    await page.waitForURL("**/beranda", { timeout: 10_000 });

    await page.close();
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(sharedEmail);
    await page.getByLabel("Password").fill("testpass1234");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });
  });

  test("filter Pengeluaran hanya menampilkan expense", async ({ page }) => {
    await page.goto("/riwayat");

    // Klik filter Pengeluaran
    await page.getByRole("button", { name: "Pengeluaran" }).click();
    await page.waitForTimeout(500); // tunggu reload

    // Seed expense harus muncul
    await expect(page.getByText("filter-expense-seed-1")).toBeVisible({ timeout: 8_000 });

    // Seed income TIDAK boleh muncul
    await expect(page.getByText("filter-income-seed")).not.toBeVisible();
  });

  test("filter Pemasukan hanya menampilkan income", async ({ page }) => {
    await page.goto("/riwayat");

    await page.getByRole("button", { name: "Pemasukan" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("filter-income-seed")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("filter-expense-seed-1")).not.toBeVisible();
  });

  test("filter Semua menampilkan semua transaksi", async ({ page }) => {
    await page.goto("/riwayat");

    // Terapkan filter dulu
    await page.getByRole("button", { name: "Pengeluaran" }).click();
    await page.waitForTimeout(300);

    // Reset ke Semua
    await page.getByRole("button", { name: "Semua" }).click();
    await page.waitForTimeout(500);

    // Semua seed harus muncul
    await expect(page.getByText("filter-income-seed")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("filter-expense-seed-1")).toBeVisible({ timeout: 5_000 });
  });

  test("riwayat kosong menampilkan pesan jika tidak ada transaksi", async ({ page }) => {
    // Buat user baru yang tidak punya transaksi
    const emptyEmail = uniqueEmail();
    await page.goto("/daftar");
    await page.getByLabel("Email").fill(emptyEmail);
    await page.getByLabel("Password", { exact: true }).fill("testpass1234");
    await page.getByLabel("Konfirmasi Password").fill("testpass1234");
    await page.getByRole("button", { name: "Daftar" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });

    await page.goto("/riwayat");
    await expect(page.getByText(/Belum ada transaksi/i)).toBeVisible({ timeout: 8_000 });
  });
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function waitCategory(page: import("@playwright/test").Page) {
  const sel = page.getByLabel("Kategori");
  await sel.waitFor({ state: "attached" });
  return sel;
}

async function firstCatValue(page: import("@playwright/test").Page): Promise<string> {
  const sel = page.getByLabel("Kategori");
  const val = await sel.locator("option").nth(1).getAttribute("value");
  return val ?? "";
}
