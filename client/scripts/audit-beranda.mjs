/* Audit visual beranda via DOM — bukan test.
   Urutan: login → dismiss tur onboarding (jika muncul) → checks → screenshot.
   Jalankan dari client/: node scripts/audit-beranda.mjs */
import { chromium } from "@playwright/test";

const EMAIL = "demo@uangku.app";
const PASSWORD = "demopass1234";

const loginAndDismissTour = async (page) => {
  await page.goto("http://localhost:3000/masuk");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/beranda", { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Tur onboarding menutupi beranda sampai onboarding_done=true.
  const dialog = page.locator('[aria-label="Panduan Mochi"]');
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: "Lewati" }).click();
    await dialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  }
  await page.waitForTimeout(2000); // animasi masuk + data selesai
};

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const results = [];
  const check = (name, pass, detail = "") =>
    results.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);

  // ---------- Mobile ----------
  const mobile = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const m = await mobile.newPage();
  await loginAndDismissTour(m);

  // 1. Overflow horizontal
  const overflow = await m.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  check(
    "Tidak ada overflow horizontal (mobile)",
    overflow.scrollW <= overflow.innerW + 1,
    `scrollWidth=${overflow.scrollW}, viewport=${overflow.innerW}`
  );

  // 2. Kartu saldo: warna brand navy (token bg-brand = #024691)
  const balance = await m.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) =>
      d.className?.includes?.("bg-brand")
    );
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, shadow: cs.boxShadow !== "none" };
  });
  check(
    "BalanceCard pakai navy brand #024691",
    balance?.bg === "rgb(2, 70, 145)",
    balance?.bg ?? "elemen tidak ditemukan"
  );
  check("BalanceCard punya shadow", balance?.shadow === true);

  // 3. Mask saldo: default termasked, tombol mata ada
  const mask = await m.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Tampilkan saldo"]');
    const dots = [...document.querySelectorAll("span")].some((s) =>
      s.textContent?.includes("••••••")
    );
    return { btn: Boolean(btn), dotsVisible: dots };
  });
  check(
    "BalanceCard default termasked (Rp ••••••) + tombol mata",
    mask.btn && mask.dotsVisible,
    `tombol=${mask.btn}, dots=${mask.dotsVisible}`
  );

  // 2b. Angka data memakai serif (aksen identitas, DESIGN.md §2)
  const serifFont = await m.evaluate(() => {
    const bal = document.querySelector('[data-testid="balance-value"]');
    const hero = [...document.querySelectorAll("span[aria-live=\"polite\"]")].at(-1);
    const isSerif = (el) => el && /source serif|georgia|serif/i.test(getComputedStyle(el).fontFamily);
    return {
      balance: isSerif(bal) ? getComputedStyle(bal).fontFamily.slice(0, 60) : null,
      safeToSpend: isSerif(hero) ? getComputedStyle(hero).fontFamily.slice(0, 60) : null,
    };
  });
  check(
    "Angka saldo pakai font serif",
    serifFont?.balance != null,
    serifFont?.balance ?? "elemen tidak ditemukan / bukan serif"
  );
  check(
    "Angka Safe to Spend pakai font serif",
    serifFont?.safeToSpend != null,
    serifFont?.safeToSpend ?? "elemen tidak ditemukan / bukan serif"
  );

  // 2c. Drift-guard: tidak ada tabular-nums di luar .num (input form dikecualikan)
  const naked = await m.evaluate(() =>
    [...document.querySelectorAll(".tabular-nums")].filter(
      (el) => !/^(INPUT|TEXTAREA)$/.test(el.tagName) && !el.classList.contains("num")
    ).length
  );
  check(
    "Tidak ada angka sans di luar utility .num",
    naked === 0,
    `${naked} elemen melanggar`
  );

  // 3a. Sparkline 7 hari tampil (SVG dengan aria-label sesuai §6 Data Viz)
  const spark = await m.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="7 hari"]');
    if (!svg) return { found: false };
    const paths = svg.querySelectorAll("path").length;
    return { found: paths >= 2, paths };
  });
  check(
    "Sparkline 7 hari tampil di beranda",
    spark.found === true,
    spark.found ? `${spark.paths} path SVG` : "elemen tidak ditemukan"
  );

  // 3b. SafeToSpend emerald soft ada
  const sts = await m.evaluate(() =>
    [...document.querySelectorAll("div")].some((d) =>
      d.className?.includes?.("bg-emerald-50/70")
    )
  );
  check("SafeToSpendCard latar emerald soft", sts);

  // 3c. Ring progres harian di SafeToSpend
  const ring = await m.evaluate(() => {
    const svg = document.querySelector('svg[role="progressbar"][aria-label*="batas harian"]');
    return svg ? svg.getAttribute("aria-valuenow") : null;
  });
  check("SafeToSpendCard ring progres harian", ring !== null, `aria-valuenow=${ring}`);

  // 3d. Footer kepercayaan (id-ID: pemisah jam titik, mis. "19.40")
  const footer = await m.evaluate(() =>
    [...document.querySelectorAll("p")].some((p) => /^Diperbarui \d{2}[.:]\d{2}$/.test(p.textContent ?? ""))
  );
  check("Footer 'Diperbarui HH.MM' tampil", footer);

  // 4. Donut
  const donut = await m
    .locator('svg[aria-label="Donut pengeluaran terbesar"]')
    .count();
  check("SpendingDonut tampil", donut === 1);

  // 5. Jumlah Mochi — per viewport awal & total di halaman
  const mochi = await m.evaluate(() => {
    const labels = /Mochi|Maskot UangKu/i;
    const isMochi = (el) => {
      const l = el.getAttribute("aria-label") ?? "";
      // "Panduan Mochi" = dialog, bukan maskot
      return labels.test(l) && l !== "Panduan Mochi";
    };
    const vh = window.innerHeight;
    let inViewport = 0;
    let total = 0;
    for (const el of document.querySelectorAll("[aria-label]")) {
      if (!isMochi(el)) continue;
      total++;
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.top < vh && r.height > 0) inViewport++;
    }
    return { inViewport, total };
  });
  check(
    "Mochi di beranda sesuai pengecualian §5 (beberapa kartu, komposisi brand)",
    mochi.total >= 1 && mochi.total <= 6,
    `di viewport awal: ${mochi.inViewport}, total di halaman: ${mochi.total}`
  );

  // 6. BottomNav & FAB: harus nempel di bawah viewport, bukan melayang di tengah
  const nav = await m.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigasi utama"]');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    const cs = getComputedStyle(nav);
    // Cari ancestor yang menciptakan containing block untuk position:fixed
    // (transform/filter/perspective/contain/will-change/backdrop-filter)
    const badProps = [
      "transform", "filter", "perspective", "contain",
      "backdropFilter", "willChange",
    ];
    const culprits = [];
    for (let p = nav.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      const bad = badProps.filter((k) => {
        const v = pcs[k];
        return v && v !== "none" && !(k === "willChange" && v === "auto") && !(k === "contain" && v === "none");
      });
      if (bad.length) {
        culprits.push({
          tag: p.tagName.toLowerCase(),
          cls: (p.className?.toString?.() ?? "").slice(0, 70),
          props: bad.join(","),
        });
      }
    }
    return {
      position: cs.position,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      viewportH: window.innerHeight,
      gapToBottom: Math.round(window.innerHeight - r.bottom),
      culprits,
    };
  });
  if (!nav) {
    check("BottomNav ada di DOM", false, "nav tidak ditemukan");
  } else {
    check(
      "BottomNav nempel di bawah viewport",
      nav.position === "fixed" && nav.gapToBottom <= 4,
      `position=${nav.position}, gap-bawah=${nav.gapToBottom}px (viewport ${nav.viewportH}px)`
    );
    if (nav.culprits.length) {
      results.push(
        `WARN  Ancestor dengan transform/filter/backdrop-filter (mengubah containing block fixed):\n      ${nav.culprits.map((c) => `<${c.tag}> .${c.cls} → ${c.props}`).join("\n      ")}`
      );
    }
    // FAB (+): harus di atas bar, bukan di tengah layar
    const fab = await m.evaluate(() => {
      const b = document.querySelector('button[aria-label="Catat cepat"]');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return {
        centerY: Math.round(r.top + r.height / 2),
        viewportH: window.innerHeight,
        ratio: (r.top + r.height / 2) / window.innerHeight,
      };
    });
    if (fab) {
      check(
        "FAB (+) di dekat dasar layar (bukan tengah)",
        fab.ratio >= 0.75,
        `pusat FAB di ${Math.round(fab.ratio * 100)}% tinggi layar (y=${fab.centerY}/${fab.viewportH})`
      );
    }
  }

  // 7. Screenshot (setelah tour ditutup)
  await m
    .locator("div.bg-brand")
    .first()
    .screenshot({ path: "shot-balance-card.png" });
  await m.screenshot({ path: "shot-beranda-mobile-fold.png" }); // viewport atas

  // ---------- Desktop ----------
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const d = await desktop.newPage();
  await loginAndDismissTour(d);
  await d.waitForTimeout(1500);

  // Nav di desktop juga harus nempel bawah
  const navD = await d.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigasi utama"]');
    if (!nav) return null;
    const r = nav.getBoundingClientRect();
    return { position: getComputedStyle(nav).position, gapToBottom: Math.round(window.innerHeight - r.bottom) };
  });
  check(
    "BottomNav nempel bawah (desktop)",
    navD?.position === "fixed" && navD?.gapToBottom <= 4,
    `position=${navD?.position}, gap-bawah=${navD?.gapToBottom}px`
  );

  // Screenshot desktop: viewport (bukan fullPage) agar posisi fixed tidak menyesatkan
  await d.screenshot({ path: "shot-beranda-desktop.png" });

  // JANGAN pakai fullPage: elemen position:fixed (BottomNav & FAB) tergambar
  // pada posisi viewport pertama, sehingga terlihat "melayang di tengah
  // gambar" — artefak Chromium, bukan posisi app. Ambil per-viewport saja:
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await m.waitForTimeout(400);
  await m.screenshot({ path: "shot-beranda-mobile-tengah.png" });
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await m.waitForTimeout(400);
  await m.screenshot({ path: "shot-beranda-mobile-bawah.png" }); // nav tetap di dasar

  await browser.close();
  console.log(results.join("\n"));
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
