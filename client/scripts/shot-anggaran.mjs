/**
 * Review visual halaman /anggaran.
 * Login UI sebagai akun demo → cek DOM → screenshot → uji autosave.
 * Jalankan: cd client && node scripts/shot-anggaran.mjs
 */
import { chromium } from "@playwright/test";

const EMAIL = "demo@uangku.app";
const PASSWORD = "demopass1234";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// Login via UI (pola yang sama dengan audit-beranda)
await page.goto("http://localhost:3000/masuk");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForURL("**/beranda", { timeout: 15000 });

// Buka halaman anggaran
await page.goto("http://localhost:3000/anggaran");
await page.waitForSelector('input[inputmode="numeric"]', { timeout: 15000 });
await page.waitForTimeout(1000);

const dom = await page.evaluate(() => {
  const h1 = document.querySelector("h1")?.textContent ?? "";
  const inputs = [...document.querySelectorAll('input[inputmode="numeric"]')].length;
  const summary =
    document.querySelector('section[aria-label="Ringkasan anggaran"]')?.textContent?.trim() ?? "";
  const progress = document.querySelectorAll('[role="progressbar"]').length;
  const activeTab = document.querySelector('nav a[aria-current="page"]')?.textContent ?? "";
  return { h1, inputs, summary: summary.slice(0, 140), progress, activeTab };
});
console.log("h1:", dom.h1);
console.log("input anggaran:", dom.inputs);
console.log("ringkasan:", dom.summary);
console.log("progressbar:", dom.progress);
console.log("tab nav aktif:", dom.activeTab);

await page.screenshot({ path: "shot-anggaran-fold.png" });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: "shot-anggaran-bawah.png" });

// Uji autosave: ketik per karakter (fill() tidak memicu React onChange) → blur
const firstInput = page.locator('input[inputmode="numeric"]').first();
await firstInput.click();
await firstInput.pressSequentially("250000");
await firstInput.blur();
await page.waitForTimeout(1200);
const flash = await page.evaluate(() => document.body.textContent.includes("Tersimpan"));
console.log("autosave flash:", flash ? "OK" : "TIDAK TERLIHAT (cek manual)");
await page.screenshot({ path: "shot-anggaran-after-save.png" });

await ctx.close();
await browser.close();
console.log("selesai — shot-anggaran-*.png");
