/**
 * Package the official Cirix PNG artwork into an ICO without redrawing it.
 * Source artwork: https://cirix.online/img/ (the Cirix marketing site).
 * Run from the repository root: node scripts/generate-favicon.mjs
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

// Next.js includes sharp. Its ICO decoder requires RGBA PNG entries.
const images = await Promise.all([
  readFileSync("public/brand/favicon-32x32.png"),
  readFileSync("app/apple-icon.png"),
].map((png) => sharp(png).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((png, index) => {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== height || width > 256) throw new Error("Expected square ICO artwork up to 256px");
  const entry = 6 + index * 16;
  header[entry] = width === 256 ? 0 : width;
  header[entry + 1] = height === 256 ? 0 : height;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
writeFileSync("app/favicon.ico", Buffer.concat([header, ...images]));
copyFileSync("app/apple-icon.png", "app/icon.png");
