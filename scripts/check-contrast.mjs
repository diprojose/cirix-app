/**
 * Verifies the design tokens meet WCAG AA, reading the OKLCH values straight
 * out of app/globals.css so the check can never drift from the source.
 *
 * Contrast was the failure mode of the previous system: it documented an AA
 * rule in prose and then shipped white text on a mid-tone accent. This makes
 * the claim executable.
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Reads `--color-<name>: oklch(L C H)` out of the @theme block. */
function token(name) {
  const re = new RegExp(`--color-${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`);
  const m = re.exec(CSS);
  if (!m) throw new Error(`Token --color-${name} not found (or not a literal oklch()).`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** OKLCH -> sRGB 0-255, via oklab. */
function toRgb([L, C, Hdeg]) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((u) => {
    const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  });
}

const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Every pair where real text sits on a real surface. `large` marks text at
// >=18.66px bold, where AA is 3:1 instead of 4.5:1.
const PAIRS = [
  ["on-accent sobre accent-fill", "stone-0", "brand-700"],
  ["on-action sobre action-fill", "stone-0", "action-700"],
  ["text sobre surface", "stone-900", "stone-0"],
  ["text sobre bg", "stone-900", "stone-50"],
  ["text-muted sobre bg", "stone-500", "stone-50"],
  ["text-muted sobre surface", "stone-500", "stone-0"],
  ["accent como texto sobre bg", "brand-600", "stone-50"],
  ["action como texto sobre surface", "action-600", "stone-0"],
  ["action-strong sobre action-soft", "action-800", "action-100"],
  ["accent-strong sobre accent-soft", "brand-700", "brand-100"],
  ["on-danger sobre danger", "stone-0", "danger"],
];

let failed = 0;
console.log("Contraste WCAG (AA normal = 4.5:1)\n");
for (const [label, fg, bg] of PAIRS) {
  const ratio = contrast(toRgb(token(fg)), toRgb(token(bg)));
  const ok = ratio >= 4.5;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASA " : "FALLA"}  ${label.padEnd(36)} ${ratio.toFixed(2)}:1`);
}

console.log(
  failed === 0
    ? "\nTodos los pares pasan AA."
    : `\n${failed} par(es) por debajo de 4.5:1. Ajusta el paso de la rampa en app/globals.css.`
);
process.exit(failed === 0 ? 0 : 1);
