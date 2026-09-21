/**
 * E2E: Category CRUD flows
 *
 * Covers: tambah kategori → tampil di list, rename, hapus.
 *
 * Auth hemat: SATU user + SATU sesi untuk seluruh file (shared context).
 * Login/register di-rate-limit server 5x/menit/IP. Jangan kembalikan
 * pola login di beforeEach tanpa menaikkan limit server.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

let sharedEmail: string;
let ctx: BrowserContext;

test.describe("Kategori", () => {
  test.beforeAll(async ({ browser }) => {
    // Batas rate-limit server (5x/menit) + retry 65 dtk di helper
    // butuh hook timeout lebih panjang dari default 30 dtk.
    test.setTimeout(180_000);
    sharedEmail = uniqueEmail();
    ctx = await browser.newContext();
    const pg = await ctx.newPage();
    await registerAndLogin(pg, sharedEmail);
    await pg.close();
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  // Halaman baru dalam context yang sudah login (cookie sesi terbawa).
  async function authedPage(): Promise<Page> {
    const pg = await ctx.newPage();
    await pg.goto("/akun/kategori");
    await pg.waitForURL("**/akun/kategori", { timeout: 15_000 });
    return pg;
  }

  test("tambah kategori baru", async () => {
    const page = await authedPage();
    try {
      const name = `E2E-Cat-${Date.now()}`;
      await page.getByRole("button", { name: "Tambah", exact: true }).click();
      await page.getByLabel("Nama Kategori").fill(name);
      await page.getByRole("button", { name: "Simpan" }).click();

      await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.close();
    }
  });

  test("rename kategori", async () => {
    const page = await authedPage();
    try {
      const name = `Rename-${Date.now()}`;
      const renamed = `${name}-v2`;
      await page.getByRole("button", { name: "Tambah", exact: true }).click();
      await page.getByLabel("Nama Kategori").fill(name);
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

      // Klik Ubah pada row kategori tersebut.
      // (div.p-4 + nama exact + tombol Ubah = row-nya; locator lama
      // `div:has-text(...).last()` nyangkut di kolom nama yang tidak
      // berisi tombol — sibling, bukan ancestor.)
      const row = page
        .locator("div.p-4")
        .filter({ hasText: name })
        .filter({ has: page.getByRole("button", { name: "Ubah" }) });
      await row.getByRole("button", { name: "Ubah" }).click();
      await page.getByLabel("Nama Kategori").fill(renamed);
      await page.getByRole("button", { name: "Simpan" }).click();

      await expect(page.getByText(renamed)).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.close();
    }
  });

  test("hapus kategori tak terpakai", async () => {
    const page = await authedPage();
    try {
      const name = `Delete-${Date.now()}`;
      await page.getByRole("button", { name: "Tambah", exact: true }).click();
      await page.getByLabel("Nama Kategori").fill(name);
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

      const row = page
        .locator("div.p-4")
        .filter({ hasText: name })
        .filter({ has: page.getByRole("button", { name: "Hapus" }) });
      await row.getByRole("button", { name: "Hapus" }).click();
      // Konfirmasi hapus — scope ke dialognya (".last()" page-wide bisa
      // kena tombol Hapus row lain).
      const confirm = page
        .locator("div")
        .filter({ hasText: "Hapus kategori" })
        .last();
      await confirm.getByRole("button", { name: "Hapus", exact: true }).click();

      await expect(page.getByText(name)).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await page.close();
    }
  });
});
