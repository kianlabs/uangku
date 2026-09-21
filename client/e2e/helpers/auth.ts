/**
 * E2E auth helpers.
 *
 * Pakai email unik per test run agar tidak tabrakan dengan data lain.
 * Format: e2e+<timestamp>+<random>@example.com
 * (example.com: RFC 2606, khusus dokumentasi/testing — lolos validasi
 * email-validator yang menolak domain special-use seperti *.local)
 */

import { type Page } from "@playwright/test";

/** Generate email unik per test run untuk menghindari konflik DB. */
export function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `e2e+${ts}+${rand}@example.com`;
}

async function isVisibleNow(
  page: Page,
  locator: ReturnType<Page["getByText"]>
): Promise<boolean> {
  return await locator.isVisible().catch(() => false);
}

/**
 * Register akun baru dan tunggu redirect ke /beranda.
 *
 * Tahan rate-limit: register/login dibatasi server 5x/menit/IP dan satu
 * run suite menyentuh endpoint ini belasan kali. Kalau kena 429, tunggu
 * jendela limit lewat lalu ulangi. Kalau ternyata email sudah terdaftar
 * (percobaan sebelumnya sukses parsial), lanjut login saja.
 */
export async function registerAndLogin(
  page: Page,
  email: string,
  password = "testpass1234"
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto("/daftar");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Konfirmasi Password").fill(password);
    await page.getByRole("button", { name: "Daftar" }).click();
    const done = await page
      .waitForURL("**/beranda", { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (done) return;

    if (await isVisibleNow(page, page.getByText(/email.*terdaftar|already registered/i))) {
      await loginAs(page, email, password);
      return;
    }
    if (
      attempt < 3 &&
      (await isVisibleNow(page, page.getByText(/rate limit exceeded/i)))
    ) {
      await page.waitForTimeout(65_000);
      continue;
    }
    throw new Error(`registerAndLogin gagal untuk ${email} (percobaan ${attempt})`);
  }
  throw new Error(`registerAndLogin gagal untuk ${email} (rate limit)`);
}

/** Login ke akun yang sudah ada dan tunggu redirect ke /beranda. */
export async function loginAs(
  page: Page,
  email: string,
  password = "testpass1234"
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto("/masuk");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Masuk" }).click();
    const done = await page
      .waitForURL("**/beranda", { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (done) return;

    if (
      attempt < 3 &&
      (await isVisibleNow(page, page.getByText(/rate limit exceeded/i)))
    ) {
      await page.waitForTimeout(65_000);
      continue;
    }
    throw new Error(`loginAs gagal untuk ${email} (percobaan ${attempt})`);
  }
  throw new Error(`loginAs gagal untuk ${email} (rate limit)`);
}

/** Logout dari akun dan tunggu redirect ke /masuk. */
export async function logout(page: Page): Promise<void> {
  await page.goto("/pengaturan");
  await page.getByRole("button", { name: /Keluar/i }).click();
  await page.waitForURL("**/masuk", { timeout: 10_000 });
}
