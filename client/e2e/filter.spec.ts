/**
 * E2E: Transaction filter flows
 *
 * Covers: filter by type (income/expense), filter reset.
 *
 * Auth hemat: SATU user + SATU sesi untuk test 1-3 (shared context).
 * Login/register di-rate-limit server 5x/menit/IP. Test 4 (user kosong)
 * butuh context fresh terpisah. Jangan kembalikan pola login di
 * beforeEach tanpa menaikkan limit server.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

let sharedEmail: string;
let ctx: BrowserContext;

test.describe("Filter Transaksi", () => {
  test.beforeAll(async ({ browser }) => {
    // Batas rate-limit server (5x/menit) + retry 65 dtk di helper
    // butuh hook timeout lebih panjang dari default 30 dtk.
    test.setTimeout(180_000);
    sharedEmail = uniqueEmail();
    ctx = await browser.newContext();
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
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  // Halaman baru dalam context yang sudah login (cookie sesi terbawa).
  async function authedPage(): Promise<Page> {
    const pg = await ctx.newPage();
    await pg.goto("/riwayat");
    await pg.waitForURL("**/riwayat", { timeout: 15_000 });
    return pg;
  }

  test("filter Pengeluaran hanya menampilkan expense", async () => {
    const page = await authedPage();
    try {
      // Klik filter Pengeluaran
      await page.getByRole("button", { name: "Pengeluaran" }).click();
      await page.waitForTimeout(500); // tunggu reload

      // Seed expense harus muncul
      await expect(page.getByText("filter-expense-seed-1")).toBeVisible({ timeout: 8_000 });

      // Seed income TIDAK boleh muncul
      await expect(page.getByText("filter-income-seed")).not.toBeVisible();
    } finally {
      await page.close();
    }
  });

  test("filter Pemasukan hanya menampilkan income", async () => {
    const page = await authedPage();
    try {
      await page.getByRole("button", { name: "Pemasukan" }).click();
      await page.waitForTimeout(500);

      await expect(page.getByText("filter-income-seed")).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText("filter-expense-seed-1")).not.toBeVisible();
    } finally {
      await page.close();
    }
  });

  test("filter Semua menampilkan semua transaksi", async () => {
    const page = await authedPage();
    try {
      // Terapkan filter dulu
      await page.getByRole("button", { name: "Pengeluaran" }).click();
      await page.waitForTimeout(300);

      // Reset ke Semua (exact: ada juga tombol "Semua waktu" di filter bulan)
      await page.getByRole("button", { name: "Semua", exact: true }).click();
      await page.waitForTimeout(500);

      // Semua seed harus muncul
      await expect(page.getByText("filter-income-seed")).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText("filter-expense-seed-1")).toBeVisible({ timeout: 5_000 });
    } finally {
      await page.close();
    }
  });

  test("riwayat kosong menampilkan pesan jika tidak ada transaksi", async ({ browser }) => {
    // Buat user baru yang tidak punya transaksi, di context fresh terpisah.
    const freshCtx = await browser.newContext();
    const fresh = await freshCtx.newPage();
    try {
      await registerAndLogin(fresh, uniqueEmail());
      await fresh.goto("/riwayat");
      await expect(fresh.getByText(/Belum ada catatan/i)).toBeVisible({ timeout: 8_000 });
    } finally {
      await fresh.close();
      await freshCtx.close();
    }
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
