/**
 * generate-pwa-icons.mjs
 *
 * Generates minimal PNG icons for PWA without external dependencies.
 * Uses pure Node.js Buffer + CRC32 to write valid PNG files.
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/icons");

mkdirSync(OUT_DIR, { recursive: true });

// Brand colors (matches globals.css accent + canvas tokens)
// accent: dark green ~#1a5c3a  canvas: warm off-white ~#faf8f5
const BG_COLOR = { r: 26, g: 92, b: 58, a: 255 };    // emerald dark
const FG_COLOR = { r: 250, g: 248, b: 245, a: 255 }; // warm white

// ---------------------------------------------------------------------------
// Minimal PNG encoder
// ---------------------------------------------------------------------------

function crc32(buf) {
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable = null;
function makeCrcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    _crcTable[n] = c;
  }
  return _crcTable;
}

function writeUint32BE(buf, offset, value) {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  writeUint32BE(len, 0, data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  writeUint32BE(crcVal, 0, crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function adler32(data) {
  let s1 = 1, s2 = 0;
  for (const b of data) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  return (s2 << 16) | s1;
}

/** Minimal zlib DEFLATE (stored, no compression) for small images. */
function zlibStore(data) {
  // zlib header: CMF=0x78 (deflate, window 32k), FLG=0x01 (no dict, check bits)
  const cmf = 0x78, flg = 0x01;
  // BFINAL=1, BTYPE=00 (no compression)
  const blockHeader = Buffer.from([0x01, data.length & 0xff, (data.length >> 8) & 0xff,
    (~data.length) & 0xff, ((~data.length) >> 8) & 0xff]);
  const adler = adler32(data);
  const adlerBuf = Buffer.alloc(4);
  writeUint32BE(adlerBuf, 0, adler);
  return Buffer.concat([Buffer.from([cmf, flg]), blockHeader, data, adlerBuf]);
}

/**
 * Encode raw RGBA pixel rows as PNG.
 * rows: Array of Uint8Array, each row = width * 4 bytes (RGBA)
 */
function encodePNG(width, height, rows) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB (we'll handle alpha via color type 6)
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // IDAT: each row prefixed with filter byte 0 (None)
  const rawRows = rows.map((row) => {
    const filtered = new Uint8Array(1 + row.length);
    filtered[0] = 0; // filter type None
    filtered.set(row, 1);
    return filtered;
  });
  const rawData = Buffer.concat(rawRows.map((r) => Buffer.from(r)));
  const compressed = zlibStore(rawData);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Draw icon: solid BG + rounded "U" letterform (simple pixel art)
// ---------------------------------------------------------------------------

function drawIcon(size) {
  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42; // corner radius for rounded square bg

  for (let y = 0; y < size; y++) {
    const row = new Uint8Array(size * 4);
    for (let x = 0; x < size; x++) {
      const px = x - cx;
      const py = y - cy;
      // Rounded rect background
      const inRoundedRect = isInRoundedRect(px, py, size * 0.46, size * 0.46, r * 0.22);
      const color = inRoundedRect ? BG_COLOR : { r: 0, g: 0, b: 0, a: 0 };
      row[x * 4 + 0] = color.r;
      row[x * 4 + 1] = color.g;
      row[x * 4 + 2] = color.b;
      row[x * 4 + 3] = color.a;

      if (inRoundedRect) {
        // Draw "Rp" symbol: two vertical strokes + bridge = stylized rupiah
        const inLetter = drawRp(px, py, size);
        if (inLetter) {
          row[x * 4 + 0] = FG_COLOR.r;
          row[x * 4 + 1] = FG_COLOR.g;
          row[x * 4 + 2] = FG_COLOR.b;
          row[x * 4 + 3] = FG_COLOR.a;
        }
      }
    }
    rows.push(row);
  }
  return encodePNG(size, size, rows);
}

function isInRoundedRect(px, py, hw, hh, r) {
  const ax = Math.abs(px);
  const ay = Math.abs(py);
  if (ax > hw || ay > hh) return false;
  if (ax <= hw - r || ay <= hh - r) return true;
  const dx = ax - (hw - r);
  const dy = ay - (hh - r);
  return dx * dx + dy * dy <= r * r;
}

/** Draw a simplified "Rp" or rupiah symbol using geometric primitives. */
function drawRp(px, py, size) {
  const s = size;
  // Two horizontal lines (equal-sign style) as rupiah marker at top
  const lineThick = s * 0.06;
  const lineHw = s * 0.22;
  const line1Y = -s * 0.12;
  const line2Y = -s * 0.02;
  // Vertical stroke of "R"
  const stemX = -s * 0.14;
  const stemHw = s * 0.055;
  const stemTop = -s * 0.30;
  const stemBot = s * 0.30;
  // Curved top of R (D-shape bump)
  const bumpCx = stemX + stemHw;
  const bumpCy = -s * 0.12;
  const bumpRx = s * 0.14;
  const bumpRy = s * 0.14;
  // Diagonal leg of R
  const legX1 = stemX + stemHw + s * 0.02;
  const legY1 = s * 0.02;
  const legX2 = stemX + stemHw + s * 0.18;
  const legY2 = s * 0.28;
  const legThick = stemHw;

  // Stem
  if (px >= stemX - stemHw && px <= stemX + stemHw && py >= stemTop && py <= stemBot) return true;
  // Bump (D-curve body)
  if (px >= bumpCx && py >= bumpCy - bumpRy && py <= bumpCy + bumpRy) {
    const ex = (px - bumpCx) / bumpRx;
    const ey = (py - bumpCy) / bumpRy;
    if (ex * ex + ey * ey <= 1 && px <= bumpCx + bumpRx) return true;
  }
  // Leg diagonal
  if (isNearSegment(px, py, legX1, legY1, legX2, legY2, legThick)) return true;
  // Two rupiah stripes
  if (Math.abs(py - line1Y) <= lineThick / 2 && px >= -lineHw && px <= lineHw + s * 0.04) return true;
  if (Math.abs(py - line2Y) <= lineThick / 2 && px >= -lineHw && px <= lineHw + s * 0.04) return true;

  return false;
}

function isNearSegment(px, py, x1, y1, x2, y2, thickness) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  const d2 = (px - cx) ** 2 + (py - cy) ** 2;
  return d2 <= thickness * thickness;
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

for (const size of [192, 512]) {
  const png = drawIcon(size);
  const outPath = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`✓ ${outPath} (${png.length} bytes)`);
}

console.log("PWA icons generated.");
