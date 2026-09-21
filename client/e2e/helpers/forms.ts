import { expect, type Page } from "@playwright/test";

/**
 * Submit form transaksi ("Simpan Transaksi") yang tahan terhadap
 * hit-test viewport mobile.
 *
 * Konteks: di emulasi mobile, keyboard virtual mengubah visual viewport
 * saat field diisi; tap sintetis Playwright bisa salah sasaran
 * (elemen form lain "menutupi" titik klik) padahal render-nya benar.
 * Aktivasi via keyboard (focus + Enter) adalah jalur user keyboard/a11y
 * yang valid dan deterministik di semua viewport.
 *
 * Tombol disabled selama kategori dimuat — tunggu enabled dulu agar
 * Enter tidak jadi no-op (race: submit instan vs fetch kategori).
 */
export async function submitTransaksi(
  page: Page,
  opts: { waitRedirect?: boolean } = {}
): Promise<void> {
  const { waitRedirect = true } = opts;
  const btn = page.getByRole("button", { name: "Simpan Transaksi" });
  await btn.waitFor({ state: "visible", timeout: 10_000 });
  await expect(btn).toBeEnabled({ timeout: 10_000 });
  await btn.focus();
  await page.keyboard.press("Enter");
  if (waitRedirect) {
    await page.waitForURL("**/beranda", { timeout: 10_000 });
  }
}
