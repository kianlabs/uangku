/* Test interaksi mask saldo — klik nyata, bukan cuma cek elemen.
   Jalankan dari client/: node scripts/test-mask-saldo.mjs */
import { chromium } from "@playwright/test";

const EMAIL = "demo@uangku.app";
const PASSWORD = "demopass1234";

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto("http://localhost:3000/masuk");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/beranda", { timeout: 15000 });

  const dialog = page.locator('[aria-label="Panduan Mochi"]');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: "Lewati" }).click();
    await dialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);

  const eye = page.locator('button[aria-label="Tampilkan saldo"]');

  const dotsVisible = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("span")].some((s) => s.textContent?.includes("••••••"))
    );

  console.log("1. awal  — dots:", await dotsVisible(), "| tombol ada:", await eye.count());

  // KLIK NYATA
  await eye.click();
  await page.waitForTimeout(400);

  const afterClick = await page.evaluate(() => {
    const dots = [...document.querySelectorAll("span")].some((s) =>
      s.textContent?.includes("••••••")
    );
    const balance = [...document.querySelectorAll("span")].some((s) =>
      /^Rp[\s\u00A0][\d.,]+$/.test((s.textContent ?? "").trim())
    );
    const btn = document.querySelector('button[aria-label="Sembunyikan saldo"]');
    return { dots, balance, hideBtn: Boolean(btn) };
  });
  console.log("2. setelah klik eye — dots:", afterClick.dots, "| angka saldo:", afterClick.balance, "| tombol hide:", afterClick.hideBtn);

  // Toggle balik
  await page.locator('button[aria-label="Sembunyikan saldo"]').click();
  await page.waitForTimeout(400);
  console.log("3. toggle balik  — dots:", await dotsVisible());

  // Reload → preferensi harus persist (masih unmasked karena terakhir '0')
  await page.reload();
  await page.waitForTimeout(2000);
  const persisted = await page.evaluate(() =>
    sessionStorage.getItem("uangku_balance_masked")
  );
  console.log("4. setelah reload — sessionStorage:", persisted, "| dots:", await dotsVisible());

  if (errors.length) {
    console.log("\n=== RUNTIME ERRORS ===");
    console.log(errors.join("\n"));
  } else {
    console.log("\nTidak ada console/page error.");
  }

  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
