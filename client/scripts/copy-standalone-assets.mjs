/**
 * Postbuild: salin aset statis ke output standalone.
 *
 * `output: "standalone"` (next.config.ts) tidak menyertakan `public/` dan
 * `.next/static` di `.next/standalone/` — server.js hasil build tidak akan
 * melayani keduanya, sehingga halaman gagal hydrate (lihat E2E-RESULT.md).
 * Didokumentasikan di docs Next.js: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
 */
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
  force: true,
});
await cp(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
  force: true,
});
console.log("standalone: public/ dan .next/static tersalin");
