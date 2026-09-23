/**
 * E2E: Polish UI produksi — mask saldo & swipe-to-delete.
 *
 * Covers: mask saldo default → klik buka → klik sembunyi → persist reload,
 * swipe kiri baris riwayat → hapus → undo, dan hapus permanen setelah
 * jendela undo lewat.
 *
 * Desain: tiap test SELF-SUFFICIENT — user diregistrasi via API di beforeAll
 * (hemat rate-limit 5x/menit), tiap test menyeed transaksinya sendiri via
 * API. Tidak ada dependency urutan: `--grep` satu test pun tetap hijau.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

let sharedEmail: string;
let ctx: BrowserContext;
const PASSWORD = "testpass1234";

async function apiRegister(context: BrowserContext, email: string): Promise<void> {
  // Suite jalan 1 worker / 1 IP dengan limit 5 register/menit — spec yang
  // jalan belakangan (file ini) bisa kena 429 dari sisa window spec lain.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await context.request.post("/api/v1/auth/register", {
      data: { email, password: PASSWORD },
    });
    if (res.status() === 201) return;
    if (res.status() === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 15000 * attempt));
      continue;
    }
    throw new Error(`register gagal: ${res.status()} ${await res.text()}`);
  }
}

async function apiCreateExpense(context: BrowserContext, description: string): Promise<void> {
  const cats = await context.request.get("/api/v1/categories?type=expense");
  const catJson = await cats.json();
  const catId = catJson.items[0]?.id;
  if (!catId) throw new Error("kategori expense tidak tersedia");
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const res = await context.request.post("/api/v1/transactions", {
    data: { type: "expense", amount: "50000", category_id: catId, transaction_date: iso, description },
  });
  if (res.status() !== 201) {
    throw new Error(`create tx gagal: ${res.status()} ${await res.text()}`);
  }
}

// Tutup tur onboarding (user baru belum onboarding_done).
// POLLING: dialog muncul belakangan (setelah fetch preferences selesai,
// bisa terlambat oleh splash screen 1.8 dtk) — cek sekali tidak cukup dan
// klik akan di-intercept overlay. Poll sampai muncul, klik Lewati, tunggu hilang.
async function dismissTour(page: Page): Promise<void> {
  const dialog = page.locator('[aria-label="Panduan Mochi"]');
  for (let i = 0; i < 16; i++) {
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button", { name: "Lewati" }).click();
      await dialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
      return;
    }
    await page.waitForTimeout(500);
  }
}

// Pengecekan angka/dots HANYA di dalam BalanceCard (bg-brand) — jangan
// halaman penuh, karena SafeToSpendCard juga menampilkan span "Rp angka"
// (mis. "Rp 0") yang akan bikin helper salah baca state mask.
function balanceCard(page: Page) {
  return page.locator("div.bg-brand");
}

async function saldoVisible(page: Page): Promise<boolean> {
  const text = (await balanceCard(page).getByTestId("balance-value").textContent()) ?? "";
  return /^-?Rp[\s\u00A0][\d.,]+$/.test(text.trim()); // saldo bisa negatif: "-Rp 50.000"
}

// Geser baris ke kiri sejauh ~90px (lewat ambang buka 48px).
// Scroll dulu ke baris — koordinat mouse itu viewport-absolute; kalau
// baris di bawah fold, drag terjadi di ruang kosong tanpa efek.
async function swipeLeft(page: Page, desc: string): Promise<void> {
  const link = page.locator(`a:has-text("${desc}")`).first();
  await link.scrollIntoViewIfNeeded();
  const box = await link.boundingBox();
  if (!box) throw new Error(`Baris ${desc} tidak ditemukan`);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 20, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 110, y, { steps: 10 });
  await page.mouse.up();
}

test.describe("Polish UI: mask saldo & swipe-delete", () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); // ruang untuk retry rate-limit register
    sharedEmail = `e2e+${Date.now()}+polish@example.com`;
    ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await apiRegister(ctx, sharedEmail);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  async function authedPage(): Promise<Page> {
    const pg = await ctx.newPage();
    await pg.addInitScript(() => {
      localStorage.setItem("uangku:indicator_tour_done", "1");
    });
    await pg.goto("/beranda");
    await pg.waitForURL("**/beranda", { timeout: 15_000 });
    await dismissTour(pg);
    return pg;
  }

  test("mask saldo: default termasked, klik menampilkan, klik lagi menyembunyikan", async () => {
    test.setTimeout(60_000);
    await apiCreateExpense(ctx, "Kopi pagi");
    const page = await authedPage();
    try {
      await expect(page.locator('button[aria-label="Tampilkan saldo"]')).toBeVisible({
        timeout: 15_000,
      });

      // Default: termasked
      await expect(balanceCard(page).getByText(/••••••/)).toBeVisible();
      expect(await saldoVisible(page)).toBe(false);

      // Klik mata → saldo tampil
      await page.getByRole("button", { name: "Tampilkan saldo" }).click();
      await expect(balanceCard(page).getByText(/••••••/)).toBeHidden();
      await expect(page.getByRole("button", { name: "Sembunyikan saldo" })).toBeVisible();
      expect(await saldoVisible(page)).toBe(true);

      // Klik lagi → masked balik
      await page.getByRole("button", { name: "Sembunyikan saldo" }).click();
      await expect(balanceCard(page).getByText(/••••••/)).toBeVisible();
      expect(await saldoVisible(page)).toBe(false);
    } finally {
      await page.close();
    }
  });

  test("mask saldo: preferensi bertahan setelah reload", async () => {
    test.setTimeout(60_000);
    await apiCreateExpense(ctx, "Kopi siang");
    const page = await authedPage();
    try {
      await page.getByRole("button", { name: "Tampilkan saldo" }).click();
      await expect(balanceCard(page).getByText(/••••••/)).toBeHidden({ timeout: 10_000 });

      await page.reload();
      await dismissTour(page);
      await expect(balanceCard(page).getByText(/••••••/)).toBeHidden({ timeout: 15_000 });
      expect(await saldoVisible(page)).toBe(true);
    } finally {
      await page.close();
    }
  });

  test("swipe kiri membuka tombol hapus, undo mengembalikan baris", async () => {
    test.setTimeout(60_000);
    const desc = `Swipe-undo-${Date.now()}`;
    await apiCreateExpense(ctx, desc);
    const page = await authedPage();
    try {
      await page.goto("/riwayat");
      const row = page.locator(`a:has-text("${desc}")`).first();
      await expect(row).toBeVisible({ timeout: 15_000 });

      await swipeLeft(page, desc);
      const delBtn = page.locator(`button[aria-label="Hapus transaksi ${desc}"]`);
      await expect(delBtn).toBeVisible();

      await delBtn.click();
      await expect(page.getByText("Transaksi dihapus.")).toBeVisible();
      await expect(row).toBeHidden();

      // Undo → baris kembali
      await page.getByRole("button", { name: "Urungkan" }).click();
      await expect(row).toBeVisible({ timeout: 5_000 });
    } finally {
      await page.close();
    }
  });

  test("hapus permanen setelah jendela undo lewat", async () => {
    test.setTimeout(90_000); // menunggu jendela undo 6 dtk + reload
    const desc = `Swipe-permanent-${Date.now()}`;
    await apiCreateExpense(ctx, desc);
    const page = await authedPage();
    try {
      await page.goto("/riwayat");
      const row = page.locator(`a:has-text("${desc}")`).first();
      await expect(row).toBeVisible({ timeout: 15_000 });

      await swipeLeft(page, desc);
      await page.locator(`button[aria-label="Hapus transaksi ${desc}"]`).click();
      await expect(page.getByText("Transaksi dihapus.")).toBeVisible();

      // Lewati jendela undo (6 dtk) — commit ke server berjalan.
      await page.waitForTimeout(7000);
      await expect(page.getByText("Transaksi dihapus.")).toBeHidden();

      await page.reload();
      await expect(page.locator(`a:has-text("${desc}")`)).toBeHidden({ timeout: 15_000 });
    } finally {
      await page.close();
    }
  });
});
