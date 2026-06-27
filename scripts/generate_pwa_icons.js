#!/usr/bin/env node
/**
 * Generates PNG app icons for the Kuschi Kitchen Library PWA.
 * Uses only Node.js built-ins (zlib, Buffer, fs) — no npm deps needed.
 *
 * Outputs: icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon-180.png
 */
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── CRC32 table ─────────────────────────────────────────────────────────────
const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── PNG writer ───────────────────────────────────────────────────────────────
function makePNG(width, height, drawFn) {
  // RGBA pixel buffer — drawFn receives (x, y) and returns [r,g,b,a]
  const raw = new Uint8Array(height * (1 + width * 4)); // filter byte + RGBA per row
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const off = y * (1 + width * 4) + 1 + x * 4;
      raw[off]     = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  function mkChunk(type, data) {
    const lenBuf  = Buffer.alloc(4);  lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const payload = Buffer.concat([typeBuf, data]);
    const crcBuf  = Buffer.alloc(4);  crcBuf.writeUInt32BE(crc32(payload), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const idat = mkChunk('IDAT', zlib.deflateSync(Buffer.from(raw), { level: 9 }));

  return Buffer.concat([
    sig,
    mkChunk('IHDR', ihdr),
    idat,
    mkChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
// Gold colour from --gold: #c9a96e
const GOLD = [201, 169, 110];
const BG   = [12,  12,  12];

/** Smooth circle antialiasing using signed-distance */
function circleMask(cx, cy, r, px, py) {
  const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return Math.max(0, Math.min(1, r + 0.5 - d));
}

/** Rounded square (squircle) SDF mask */
function roundRectMask(cx, cy, hw, hh, r, px, py) {
  const dx = Math.max(Math.abs(px - cx) - hw + r, 0);
  const dy = Math.max(Math.abs(py - cy) - hh + r, 0);
  const d  = Math.sqrt(dx * dx + dy * dy) - r;
  return Math.max(0, Math.min(1, -d + 0.5));
}

/** Blend fg onto bg with alpha */
function blend(bg, fg, a) {
  return bg.map((v, i) => Math.round(v * (1 - a) + fg[i] * a));
}

/**
 * Draw the "K" letterform using simple rectangle and diagonal primitives.
 * All coords are 0–1 fractions of size.
 */
function drawK(x, y, W, H, outlineW = 0) {
  const w = W, h = H;
  // Vertical bar: x 0.28–0.46, y 0.18–0.82
  const vx0 = 0.28, vx1 = 0.43, vy0 = 0.18, vy1 = 0.82;
  // Upper arm: from (0.43, 0.18) to (0.72, 0.18), taper to (0.43, 0.50)
  // Lower arm: from (0.43, 0.50) to (0.72, 0.82)
  // Arm thickness ~0.135 of height

  const armT = 0.075 * h; // half-thickness of arm

  // Vertical bar SDF (rectangle)
  function vBarAlpha(px, py) {
    const dx = Math.max(vx0 * w - px, px - vx1 * w, 0);
    const dy = Math.max(vy0 * h - py, py - vy1 * h, 0);
    const d  = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, Math.min(1, -d + 0.5));
  }

  // Upper arm: diagonal from (vx1*w, vy0*h) to (0.73*w, vy0*h) going to midY
  // modeled as rotated rectangle
  function armAlpha(px, py, upper) {
    const midY = 0.505 * h;
    const x0 = vx1 * w, y0 = upper ? vy0 * h : vy1 * h;
    const x1 = 0.73 * w, y1 = midY;
    const ex = x1 - x0, ey = y1 - y0;
    const len = Math.sqrt(ex * ex + ey * ey);
    const ux = ex / len, uy = ey / len;
    // Along arm
    const dx = px - x0, dy = py - y0;
    const along = dx * ux + dy * uy;
    const perp  = Math.abs(dx * (-uy) + dy * ux);
    if (along < -0.5 || along > len + 0.5) return 0;
    const d = perp - armT;
    return Math.max(0, Math.min(1, -d + 0.5));
  }

  const av = vBarAlpha(x, y);
  const au = armAlpha(x, y, true);
  const al = armAlpha(x, y, false);
  return Math.min(1, av + au + al);
}

// ─── Icon draw functions ───────────────────────────────────────────────────────

/** Standard icon: dark circle + gold K */
function drawIcon(x, y, W, H, maskable = false) {
  const cx = W / 2, cy = H / 2;
  const r  = maskable ? W * 0.5 : W * 0.44; // maskable fills bleed zone
  const bg = maskable ? BG : BG; // same bg either way

  let bgAlpha;
  if (maskable) {
    // fill entire canvas for maskable
    bgAlpha = 1;
  } else {
    bgAlpha = circleMask(cx, cy, r, x, y);
  }
  if (bgAlpha < 0.01) return [0, 0, 0, 0]; // transparent outside

  const kAlpha = drawK(x, y, W, H) * bgAlpha;
  const pxBg   = blend([0, 0, 0, 0].map((_, i) => bg[i] || 0), bg, bgAlpha);
  const pxFg   = blend(pxBg, GOLD, kAlpha);
  const a      = maskable ? 255 : Math.round(bgAlpha * 255);
  return [pxFg[0], pxFg[1], pxFg[2], a];
}

// ─── Output ───────────────────────────────────────────────────────────────────
const OUT = path.resolve(__dirname, '..');
const icons = [
  { name: 'icon-192.png',          size: 192, maskable: false },
  { name: 'icon-512.png',          size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true  },
  { name: 'apple-touch-icon-180.png', size: 180, maskable: false },
];

for (const { name, size, maskable } of icons) {
  const buf = makePNG(size, size, (x, y, W, H) => drawIcon(x, y, W, H, maskable));
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  wrote ${name}  (${buf.length} bytes)`);
}
console.log('Done.');
