/**
 * E2E: Authentication flows
 *
 * Covers: register, login, logout, redirect unauthenticated user.
 */

import { test, expect } from "@playwright/test";
import { registerAndLogin, loginAs, logout, uniqueEmail } from "./helpers/auth";

test.describe("Auth", () => {
  test("register berhasil dan redirect ke beranda", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await expect(page).toHaveURL(/\/beranda/);
    // Beranda muncul — cek ada elemen navigasi atau konten
    await expect(page.locator("main")).toBeVisible();
  });

  test("register dengan email duplikat menampilkan error", async ({ page }) => {
    const email = uniqueEmail();
    // Register pertama kali
    await registerAndLogin(page, email);
    // Logout
    await logout(page);
    // Coba register lagi dengan email yang sama
    await page.goto("/daftar");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("testpass1234");
    await page.getByLabel("Konfirmasi Password").fill("testpass1234");
    await page.getByRole("button", { name: "Daftar" }).click();

    // Error harus muncul (email sudah terdaftar)
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5_000 });
  });

  test("register dengan password pendek menampilkan validasi", async ({ page }) => {
    await page.goto("/daftar");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password", { exact: true }).fill("123");
    await page.getByLabel("Konfirmasi Password").fill("123");
    await page.getByRole("button", { name: "Daftar" }).click();

    // Validasi password minimal 8 karakter
    await expect(page.getByText(/minimal 8/i)).toBeVisible({ timeout: 3_000 });
  });

  test("login berhasil", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);
    await logout(page);
    await loginAs(page, email);

    await expect(page).toHaveURL(/\/beranda/);
  });

  test("login dengan password salah menampilkan error", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);
    await logout(page);

    await page.goto("/masuk");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5_000 });
  });

  test("logout membersihkan sesi dan redirect ke /masuk", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);
    await logout(page);

    await expect(page).toHaveURL(/\/masuk/);
  });

  test("akses /beranda tanpa login redirect ke /masuk", async ({ page }) => {
    // Pakai context baru (fresh — tidak ada session)
    await page.goto("/beranda");
    // Tunggu redirect atau cek URL akhir
    await page.waitForURL(/\/masuk/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/masuk/);
  });

  test("halaman /masuk memiliki link ke /daftar", async ({ page }) => {
    await page.goto("/masuk");
    await expect(page.getByRole("link", { name: /Daftar/i })).toBeVisible();
  });

  test("halaman /daftar memiliki link ke /masuk", async ({ page }) => {
    await page.goto("/daftar");
    await expect(page.getByRole("link", { name: /Masuk/i })).toBeVisible();
  });
});
