import { createElement, type CSSProperties } from "react";
import { brandPalette } from "@/modules/card-design/domain/card-design";

/** The theme's accent tokens, pointed at a business's colour. */
function brandTokens(color: string): Record<string, string> {
  const palette = brandPalette(color);
  return {
    "--color-accent": palette.text,
    "--color-accent-strong": palette.textStrong,
    "--color-accent-fill": palette.fill,
    "--color-accent-fill-strong": palette.fillStrong,
    "--color-accent-soft": palette.soft,
    "--color-accent-subtle": palette.subtle,
    "--color-on-accent": palette.onFill,
  };
}

/**
 * Inline style that re-points the accent tokens inside one element, such as the
 * editor's preview: every `bg-accent-fill`, `text-on-accent`, `ring-accent`…
 * inside it wears the brand instead of Cirix blue.
 */
export function brandStyle(color: string): CSSProperties {
  return brandTokens(color) as CSSProperties;
}

/**
 * Dresses the whole screen in a business's colour while the page that renders it
 * is open, including what the layout draws outside the page (the install
 * prompt). Its selector outranks the light theme's `html[data-theme="light"]`.
 * Leaving the page unmounts it, and the app goes back to Cirix blue.
 */
export function BrandTheme({ color }: { color: string }) {
  const tokens = Object.entries(brandTokens(color))
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  // The values come from brandPalette, which only ever produces #rrggbb.
  return createElement("style", null, `html:root[data-theme]{${tokens}}`);
}
