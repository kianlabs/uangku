/**
 * E2E auth helpers.
 *
 * Pakai email unik per test run agar tidak tabrakan dengan data lain.
 * Format: e2e+<timestamp>+<random>@test.local
 */

import { type Page } from "@playwright/test";

/** Generate email unik per test run untuk menghindari konflik DB. */
export function uniqueEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `e2e+${ts}+${rand}@test.local`;
}

/** Register akun baru dan tunggu redirect ke /beranda. */
export async function registerAndLogin(
  page: Page,
  email: string,
  password = "testpass1234"
): Promise<void> {
  await page.goto("/daftar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi Password").fill(password);
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL("**/beranda", { timeout: 15_000 });
}

/** Login ke akun yang sudah ada dan tunggu redirect ke /beranda. */
export async function loginAs(
  page: Page,
  email: string,
  password = "testpass1234"
): Promise<void> {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/beranda", { timeout: 15_000 });
}

/** Logout dari akun dan tunggu redirect ke /masuk. */
export async function logout(page: Page): Promise<void> {
  await page.goto("/akun");
  await page.getByRole("button", { name: /Keluar/i }).click();
  await page.waitForURL("**/masuk", { timeout: 10_000 });
}
