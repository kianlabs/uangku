/**
 * E2E: Transaction CRUD flows
 *
 * Covers: tambah expense → tampil di dashboard, edit, delete.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

// Buat satu user bersama untuk semua test dalam describe ini
let sharedEmail: string;

test.describe("Transaksi", () => {
  test.beforeAll(async ({ browser }) => {
    sharedEmail = uniqueEmail();
    const page = await browser.newPage();
    await registerAndLogin(page, sharedEmail);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login sebelum tiap test
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(sharedEmail);
    await page.getByLabel("Password").fill("testpass1234");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });
  });

  test("tambah expense baru", async ({ page }) => {
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
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();

    // Harus redirect ke /beranda setelah submit berhasil
    await page.waitForURL("**/beranda", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/beranda/);
  });

  test("transaksi baru muncul di riwayat", async ({ page }) => {
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
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();
    await page.waitForURL("**/beranda", { timeout: 10_000 });

    // Cek di riwayat
    await page.goto("/riwayat");
    await expect(page.getByText(desc)).toBeVisible({ timeout: 10_000 });
  });

  test("lihat detail transaksi", async ({ page }) => {
    // Buka riwayat dan klik transaksi pertama
    await page.goto("/riwayat");
    const firstTx = page.locator("a[href^='/transaksi/']").first();
    await firstTx.waitFor({ state: "visible", timeout: 10_000 });
    await firstTx.click();

    // Harus berada di halaman detail
    await expect(page).toHaveURL(/\/transaksi\/[a-f0-9-]+$/, { timeout: 5_000 });
    // Halaman detail menampilkan nominal
    await expect(page.getByText(/Pengeluaran|Pemasukan/i)).toBeVisible();
  });

  test("edit transaksi", async ({ page }) => {
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
  });

  test("hapus transaksi", async ({ page }) => {
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
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();
    await page.waitForURL("**/beranda", { timeout: 10_000 });

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
  });

  test("tambah pemasukan", async ({ page }) => {
    await page.goto("/transaksi/tambah");

    // Switch ke Pemasukan
    await page.getByRole("button", { name: "Pemasukan" }).click();

    await page.getByLabel("Nominal").fill("3000000");

    const categorySelect = page.getByLabel("Kategori");
    await categorySelect.waitFor({ state: "attached" });
    const firstOption = categorySelect.locator("option").nth(1);
    await categorySelect.selectOption(await firstOption.getAttribute("value") ?? "");

    await page.getByLabel("Tanggal").fill(todayISO());
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();

    await page.waitForURL("**/beranda", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/beranda/);
  });

  test("nominal wajib diisi — validasi form", async ({ page }) => {
    await page.goto("/transaksi/tambah");

    // Coba submit tanpa isi nominal
    await page.getByRole("button", { name: "Simpan Transaksi" }).click();

    // Error validasi muncul
    await expect(page.getByText(/Nominal harus/i)).toBeVisible({ timeout: 3_000 });
  });
});

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
