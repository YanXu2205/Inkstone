/**
 * Generate all Tauri bundle icons from code — no image editor needed.
 *
 * Design: diagonal indigo→violet gradient on a rounded square with
 * three white "document lines" (matches public/icon.svg).
 *
 * Outputs: 32/128/256 PNG, icon.ico (PNG-embedded), icon.icns.
 * Usage: node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src-tauri", "icons");

/* ---------- tiny PNG encoder ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- render the mark (RGBA buffer) ---------- */

const lerp = (a, b, t) => a + (b - a) * t;
const C1 = [0x63, 0x66, 0xf1]; // #6366f1
const C2 = [0xa8, 0x55, 0xf7]; // #a855f7

/** Is point (nx, ny) in [0,1]² inside the rounded square? */
function inRoundedSquare(nx, ny) {
  const r = 0.22;
  const x = Math.abs(nx - 0.5);
  const y = Math.abs(ny - 0.5);
  if (x <= 0.5 - r || y <= 0.5 - r) return x <= 0.5 && y <= 0.5;
  const dx = x - (0.5 - r);
  const dy = y - (0.5 - r);
  return dx * dx + dy * dy <= r * r;
}

/** Document lines: y-centers & widths (fractions). */
const BARS = [
  { y: 0.281, w: 0.5625, alpha: 0.95 },
  { y: 0.461, w: 0.375, alpha: 0.8 },
  { y: 0.641, w: 0.469, alpha: 0.65 },
];
const BAR_H = 0.078;
const BAR_X = 0.219;

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          if (!inRoundedSquare(nx, ny)) continue;
          a += 255;
          const t = (nx + ny) / 2;
          let cr = lerp(C1[0], C2[0], t);
          let cg = lerp(C1[1], C2[1], t);
          let cb = lerp(C1[2], C2[2], t);
          for (const bar of BARS) {
            const by = Math.abs(ny - bar.y);
            if (
              nx >= BAR_X &&
              nx <= BAR_X + bar.w &&
              by <= BAR_H / 2
            ) {
              cr = lerp(cr, 255, bar.alpha);
              cg = lerp(cg, 255, bar.alpha);
              cb = lerp(cb, 255, bar.alpha);
            }
          }
          r += cr; g += cg; b += cb;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = Math.round(a / n);
    }
  }
  return px;
}

/* ---------- ICO / ICNS containers ---------- */

function makeICO(png) {
  // single 256×256 PNG-embedded icon (Vista+)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = 0; // 256 → 0
  entry[1] = 0;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // data offset
  return Buffer.concat([header, entry, png]);
}

function makeICNS(entries) {
  // entries: [type, png][]
  const chunks = entries.map(([type, png]) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(total + 8, 4);
  return Buffer.concat([head, ...chunks]);
}

/* ---------- go ---------- */

mkdirSync(OUT, { recursive: true });

const png32 = encodePNG(render(32), 32, 32);
const png128 = encodePNG(render(128), 128, 128);
const png256 = encodePNG(render(256), 256, 256);
const png512 = encodePNG(render(512), 512, 512);

writeFileSync(join(OUT, "32x32.png"), png32);
writeFileSync(join(OUT, "128x128.png"), png128);
writeFileSync(join(OUT, "128x128@2x.png"), png256);
writeFileSync(join(OUT, "icon.ico"), makeICO(png256));
writeFileSync(
  join(OUT, "icon.icns"),
  makeICNS([
    ["ic07", png128],
    ["ic08", png256],
    ["ic09", png512],
  ]),
);
writeFileSync(join(OUT, "icon.png"), png512);

console.log("icons written to", OUT);
