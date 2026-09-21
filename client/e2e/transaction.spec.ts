/**
 * E2E: Transaction CRUD flows
 *
 * Covers: tambah expense → tampil di dashboard, edit, delete.
 *
 * Auth hemat: SATU user + SATU login untuk seluruh file (shared context).
 * Login/register di-rate-limit server 5x/menit/IP — login per-test
 * (beforeEach) membuat test-test akhir selalu 429. Jangan kembalikan
 * pola login di beforeEach tanpa menaikkan limit server.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";
import { submitTransaksi } from "./helpers/forms";

// Satu user + satu sesi untuk semua test dalam describe ini
let sharedEmail: string;
let ctx: BrowserContext;

test.describe("Transaksi", () => {
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
    await pg.goto("/beranda");
    await pg.waitForURL("**/beranda", { timeout: 15_000 });
    return pg;
  }

  test("tambah expense baru", async () => {
    const page = await authedPage();
    try {
      await page.goto("/transaksi/tambah");

      // Pilih tipe pengeluaran (default sudah expense)
      await expect(page.getByRole("button", { name: "Pengeluaran" })).toBeVisible();

      // Isi nominal
      await page.getByLabel("Nominal").fill("50000");

      // Pilih kategori pertama yang tersedia
      const categorySelect = page.getByLabel("Kategori");
      await categorySelect.waitFor({ state: "attached" });
      const firstOption = categorySelect.locator("option").nth(1);
      const catValue = await firstOption.getAttribute("value");
      await categorySelect.selectOption(catValue!);

      // Isi tanggal (hari ini sudah default)
      await page.getByLabel("Tanggal").fill(todayISO());

      // Submit
      await submitTransaksi(page);

      // Harus redirect ke /beranda setelah submit berhasil
      await expect(page).toHaveURL(/\/beranda/);
    } finally {
      await page.close();
    }
  });

  test("transaksi baru muncul di riwayat", async () => {
    const page = await authedPage();
    try {
      // Tambah transaksi dengan deskripsi unik
      const desc = `E2E-${Date.now()}`;
      await page.goto("/transaksi/tambah");
      await page.getByLabel("Nominal").fill("75000");

      const categorySelect = page.getByLabel("Kategori");
      await categorySelect.waitFor({ state: "attached" });
      const firstOption = categorySelect.locator("option").nth(1);
      await categorySelect.selectOption(await firstOption.getAttribute("value") ?? "");

      await page.getByLabel("Tanggal").fill(todayISO());
      await page.getByLabel("Catatan").fill(desc);
      await submitTransaksi(page);

      // Cek di riwayat
      await page.goto("/riwayat");
      await expect(page.getByText(desc)).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.close();
    }
  });

  test("lihat detail transaksi", async () => {
    const page = await authedPage();
    try {
      // Buka riwayat dan klik transaksi pertama
      await page.goto("/riwayat");
      const firstTx = page.locator("a[href^='/transaksi/']").first();
      await firstTx.waitFor({ state: "visible", timeout: 10_000 });
      await firstTx.click();

      // Harus berada di halaman detail
      await expect(page).toHaveURL(/\/transaksi\/[a-f0-9-]+$/, { timeout: 5_000 });
      // Halaman detail menampilkan nominal
      await expect(page.getByText(/Pengeluaran|Pemasukan/i)).toBeVisible();
    } finally {
      await page.close();
    }
  });

  test("edit transaksi", async () => {
    const page = await authedPage();
    try {
      // Buka transaksi pertama dari riwayat
      await page.goto("/riwayat");
      const firstTx = page.locator("a[href^='/transaksi/']").first();
      await firstTx.waitFor({ state: "visible", timeout: 10_000 });
      const txHref = await firstTx.getAttribute("href");
      await firstTx.click();

      // Klik Edit
      await page.getByRole("link", { name: "Edit" }).click();
      await expect(page).toHaveURL(new RegExp(`${txHref}/edit`), { timeout: 5_000 });

      // Update deskripsi
      const newDesc = `edited-${Date.now()}`;
      const descInput = page.getByLabel("Catatan");
      await descInput.clear();
      await descInput.fill(newDesc);

      // Simpan
      await page.getByRole("button", { name: /Simpan/i }).click();

      // Harus kembali ke detail atau beranda
      await page.waitForURL(/\/(beranda|transaksi\/)/, { timeout: 10_000 });
    } finally {
      await page.close();
    }
  });

  test("hapus transaksi", async () => {
    const page = await authedPage();
    try {
      // Tambah transaksi khusus untuk dihapus
      const desc = `delete-me-${Date.now()}`;
      await page.goto("/transaksi/tambah");
      await page.getByLabel("Nominal").fill("10000");

      const categorySelect = page.getByLabel("Kategori");
      await categorySelect.waitFor({ state: "attached" });
      const firstOption = categorySelect.locator("option").nth(1);
      await categorySelect.selectOption(await firstOption.getAttribute("value") ?? "");

      await page.getByLabel("Tanggal").fill(todayISO());
      await page.getByLabel("Catatan").fill(desc);
      await submitTransaksi(page);

      // Temukan transaksi di riwayat
      await page.goto("/riwayat");
      await page.getByText(desc).click();

      // Klik Hapus
      await page.getByRole("button", { name: "Hapus" }).click();

      // Konfirmasi hapus
      await page.getByRole("button", { name: "Hapus" }).last().click();

      // Harus redirect ke /riwayat setelah hapus
      await page.waitForURL("**/riwayat", { timeout: 10_000 });

      // Transaksi tidak lagi ada
      await expect(page.getByText(desc)).not.toBeVisible({ timeout: 5_000 });
    } finally {
      await page.close();
    }
  });

  test("tambah pemasukan", async () => {
    const page = await authedPage();
    try {
      await page.goto("/transaksi/tambah");

      // Switch ke Pemasukan
      await page.getByRole("button", { name: "Pemasukan" }).click();

      await page.getByLabel("Nominal").fill("3000000");

      const categorySelect = page.getByLabel("Kategori");
      await categorySelect.waitFor({ state: "attached" });
      const firstOption = categorySelect.locator("option").nth(1);
      await categorySelect.selectOption(await firstOption.getAttribute("value") ?? "");

      await page.getByLabel("Tanggal").fill(todayISO());
      await submitTransaksi(page);

      await expect(page).toHaveURL(/\/beranda/);
    } finally {
      await page.close();
    }
  });

  test("nominal wajib diisi — validasi form", async () => {
    const page = await authedPage();
    try {
      await page.goto("/transaksi/tambah");

      // Coba submit tanpa isi nominal (tanpa redirect)
      await submitTransaksi(page, { waitRedirect: false });

      // Error validasi muncul
      await expect(page.getByText(/Nominal harus/i)).toBeVisible({ timeout: 3_000 });
    } finally {
      await page.close();
    }
  });
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
