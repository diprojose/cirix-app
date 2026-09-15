/**
 * Generates the grocery demo PWA icon set as opaque PNGs, with no image dependency.
 * Portal favicons use the official Cirix artwork; see generate-favicon.mjs.
 *
 * The icons are still placeholders standing in for real Cirix Tech Platform artwork, but
 * they now carry the grocery brand green and a simple leaf mark instead of the
 * previous flat pink squares. Everything is drawn analytically, so re-running
 * this after a token change reproduces the whole set.
 *
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// Brand colours, mirroring app/globals.css (brand-700 / brand-500 / stone-0).
const GREEN_DARK = [0x20, 0x66, 0x3a];
const GREEN = [0x2d, 0x82, 0x49];
const CREAM = [0xfe, 0xfd, 0xfc];

/** CRC-32, needed for every PNG chunk. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Wraps data in a PNG chunk (length + type + data + crc). */
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Encodes an RGB pixel buffer (size*size*3) as an 8-bit truecolour PNG. */
function encodePng(size, rgb) {
  const stride = size * 3;
  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour, no alpha (iOS needs opaque)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Draws the mark: a green field with a soft radial lift and a cream leaf.
 * `safe` is the fraction of the canvas the mark may occupy — maskable icons
 * pass 0.6 so the glyph survives Android's circular crop.
 */
function drawIcon(size, safe) {
  const buf = Buffer.alloc(size * size * 3);
  const c = size / 2;
  const leafR = (size * safe) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - c) / c;
      const dy = (y - c) / c;
      // Background: brand green lifted toward the lighter tone at the top left.
      const lift = Math.max(0, 1 - Math.hypot(dx + 0.35, dy + 0.45) / 1.5);
      let px = GREEN_DARK.map((v, i) => Math.round(v + (GREEN[i] - v) * lift));

      // Leaf: a lens (the overlap of two offset circles) rotated 45deg, which
      // gives the pointed tips a plain ellipse lacks, cut by a midrib line.
      const ux = (x - c) / leafR;
      const uy = (y - c) / leafR;
      const rx = (ux + uy) / Math.SQRT2;
      const ry = (uy - ux) / Math.SQRT2;
      const LENS_R = 1.0;
      const LENS_OFFSET = 0.58;
      const inLeaf =
        Math.hypot(rx, ry + LENS_OFFSET) <= LENS_R &&
        Math.hypot(rx, ry - LENS_OFFSET) <= LENS_R;
      const onMidrib = Math.abs(ry) < 0.05 && Math.abs(rx) < 0.75;
      if (inLeaf && !onMidrib) px = CREAM;

      const o = (y * size + x) * 3;
      buf[o] = px[0];
      buf[o + 1] = px[1];
      buf[o + 2] = px[2];
    }
  }
  return encodePng(size, buf);
}

const targets = [
  ["public/icon-192x192.png", 192, 0.62],
  ["public/icon-512x512.png", 512, 0.62],
  ["public/icon-maskable-192x192.png", 192, 0.42],
  ["public/icon-maskable-512x512.png", 512, 0.42],
];

for (const [path, size, safe] of targets) {
  writeFileSync(path, drawIcon(size, safe));
  console.log(`wrote ${path} (${size}x${size})`);
}
