/**
 * E2E: Category CRUD flows
 *
 * Covers: tambah kategori → tampil di list, rename, hapus.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, uniqueEmail } from "./helpers/auth";

let sharedEmail: string;

test.describe("Kategori", () => {
  test.beforeAll(async ({ browser }) => {
    sharedEmail = uniqueEmail();
    const page = await browser.newPage();
    await registerAndLogin(page, sharedEmail);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(sharedEmail);
    await page.getByLabel("Password").fill("testpass1234");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("**/beranda", { timeout: 15_000 });
  });

  test("tambah kategori baru", async ({ page }) => {
    const name = `E2E-Cat-${Date.now()}`;
    await page.goto("/akun/kategori");
    await page.getByRole("button", { name: "Tambah" }).click();
    await page.getByLabel("Nama Kategori").fill(name);
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  });

  test("rename kategori", async ({ page }) => {
    const name = `Rename-${Date.now()}`;
    const renamed = `${name}-v2`;
    await page.goto("/akun/kategori");
    await page.getByRole("button", { name: "Tambah" }).click();
    await page.getByLabel("Nama Kategori").fill(name);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    // Klik Ubah pada row kategori tersebut
    const row = page.locator("div", { hasText: name }).last();
    await row.getByRole("button", { name: "Ubah" }).click();
    await page.getByLabel("Nama Kategori").fill(renamed);
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText(renamed)).toBeVisible({ timeout: 10_000 });
  });

  test("hapus kategori tak terpakai", async ({ page }) => {
    const name = `Delete-${Date.now()}`;
    await page.goto("/akun/kategori");
    await page.getByRole("button", { name: "Tambah" }).click();
    await page.getByLabel("Nama Kategori").fill(name);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });

    const row = page.locator("div", { hasText: name }).last();
    await row.getByRole("button", { name: "Hapus" }).click();
    // Konfirmasi hapus
    await page.getByRole("button", { name: "Hapus" }).last().click();

    await expect(page.getByText(name)).not.toBeVisible({ timeout: 10_000 });
  });
});
