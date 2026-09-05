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
import ts from "typescript";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const BRAND_CONTRAST_SOURCE = readFileSync(
  new URL(
    "../modules/loyalty/branding/application/color-contrast.ts",
    import.meta.url
  ),
  "utf8"
);

/** Reads a literal hex/oklch token or follows a semantic var reference. */
function token(name, seen = new Set()) {
  if (seen.has(name)) throw new Error("Circular token reference at --color-" + name);
  seen.add(name);
  const re = new RegExp("--color-" + name + ":\\s*([^;]+)");
  const match = re.exec(CSS);
  if (!match) throw new Error("Token --color-" + name + " not found.");
  const value = match[1].trim();
  const oklch = value.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/);
  if (oklch) return toRgb(oklch.slice(1).map(Number));
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return hex[1].match(/../g).map((channel) => parseInt(channel, 16));
  const reference = value.match(/^var\(--color-([^)]+)\)$/);
  if (reference) return token(reference[1], seen);
  throw new Error("Token --color-" + name + " must be a literal hex/oklch or a color token reference.");
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
  ["on-accent sobre accent-fill", "on-accent", "accent-fill"],
  ["on-accent sobre accent-fill-strong", "on-accent", "accent-fill-strong"],
  ["on-action sobre action-fill", "on-action", "action-fill"],
  ["on-action sobre action-fill-strong", "on-action", "action-fill-strong"],
  ["text sobre surface", "text", "surface"],
  ["text sobre bg", "text", "bg"],
  ["text-muted sobre bg", "text-muted", "bg"],
  ["text-muted sobre surface", "text-muted", "surface"],
  ["accent como texto sobre bg", "accent", "bg"],
  ["action como texto sobre surface", "action", "surface"],
  ["action-strong sobre action-soft", "action-strong", "action-soft"],
  ["accent-strong sobre accent-soft", "accent-strong", "accent-soft"],
  ["on-danger sobre danger", "on-danger", "danger"],
];
let failed = 0;
console.log("Contraste WCAG (AA normal = 4.5:1)\n");
for (const [label, fg, bg] of PAIRS) {
  const ratio = contrast(token(fg), token(bg));
  const ok = ratio >= 4.5;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASA " : "FALLA"}  ${label.padEnd(36)} ${ratio.toFixed(2)}:1`);
}

// Exercise the actual runtime selector against awkward client-supplied fills,
// not just the built-in CSS preset. Importing transpiled source keeps this test
// tied to the TypeScript implementation without adding a separate test runner.
const brandContrastJavaScript = ts.transpileModule(BRAND_CONTRAST_SOURCE, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const brandContrast = await import(
  `data:text/javascript;base64,${Buffer.from(brandContrastJavaScript).toString("base64")}`
);
for (const fill of ["#747474", "#7f7f7f", "#164e3d", "#ff6636"]) {
  const foreground = brandContrast.readableText(fill);
  const ratio = brandContrast.contrastRatio(foreground, fill);
  const ok = ratio >= 4.5;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASA " : "FALLA"}  texto calculado sobre ${fill.padEnd(17)} ${ratio.toFixed(2)}:1`
  );
}

console.log(
  failed === 0
    ? "\nTodos los pares pasan AA."
    : `\n${failed} par(es) por debajo de 4.5:1. Ajusta el paso de la rampa en app/globals.css.`
);
process.exit(failed === 0 ? 0 : 1);
