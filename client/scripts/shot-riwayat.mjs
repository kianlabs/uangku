/**
 * Review visual halaman /riwayat: hero Mochi terpusat + cek DOM.
 * Jalankan: cd client && node scripts/shot-riwayat.mjs
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

await page.goto("http://localhost:3000/masuk");
await page.getByLabel("Email").fill(EMAIL);
await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForURL("**/beranda", { timeout: 15000 });

await page.goto("http://localhost:3000/riwayat");
await page.waitForSelector("h1", { timeout: 15000 });
await page.waitForTimeout(1500);

const dom = await page.evaluate(() => {
  const h1 = document.querySelector("h1")?.textContent ?? "";
  const mochi = [...document.querySelectorAll('[aria-label^="Mochi"]')].map((el) =>
    el.getAttribute("aria-label")
  );
  const hero = document.querySelector('[aria-label*="melihat riwayat"]');
  const centered = hero
    ? getComputedStyle(hero.parentElement).textAlign === "center"
    : false;
  return { h1, mochi, centered };
});
console.log("h1:", dom.h1);
console.log("mochi di halaman:", dom.mochi.length, "|", dom.mochi.join(" ; "));
console.log("hero terpusat:", dom.centered ? "OK" : "CEK MANUAL");

await page.screenshot({ path: "shot-riwayat-fold.png" });
await ctx.close();
await browser.close();
console.log("selesai — shot-riwayat-fold.png");
