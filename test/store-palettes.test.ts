import { describe, expect, it } from "vitest";
import {
  STORE_PALETTES,
  PALETTE_KEYS,
  applyPalette,
  matchingPalette,
} from "@/modules/loyalty/demo/palettes";
import { DEFAULT_BRAND_PROFILE } from "@/modules/loyalty/branding/infrastructure/brand-profile-seed";
import { validateBrandProfile } from "@/modules/loyalty/branding/application/brand-profile";
import { contrastRatio } from "@/modules/loyalty/branding/application/color-contrast";
import { themeVariables } from "@/modules/loyalty/branding/ui/brand-theme";
import {
  createDemoState,
  restoreDemo,
  updateDemo,
} from "@/modules/loyalty/demo/model";

describe("store palette library", () => {
  it("offers 15 distinct palettes across four families", () => {
    expect(STORE_PALETTES).toHaveLength(15);
    expect(new Set(STORE_PALETTES.map((p) => p.id)).size).toBe(15);
    expect(
      new Set(STORE_PALETTES.map((p) => JSON.stringify(p.colors))).size,
    ).toBe(15);
    expect(new Set(STORE_PALETTES.map((p) => p.family))).toEqual(
      new Set(["natural", "warm", "vivid", "dark"]),
    );
    for (const p of STORE_PALETTES)
      expect(Object.keys(p.colors)).toEqual([...PALETTE_KEYS]);
  });

  it.each(STORE_PALETTES)(
    "$id validates, persists and keeps semantic colors readable",
    (palette) => {
      const brand = applyPalette(DEFAULT_BRAND_PROFILE, palette);
      expect(validateBrandProfile(brand).ok).toBe(true);
      const vars = themeVariables(brand);
      const pairs = [
        ["--color-on-accent", "--color-accent-fill"],
        ["--color-on-accent", "--color-accent-fill-strong"],
        ["--color-on-action", "--color-action-fill"],
        ["--color-on-action", "--color-action-fill-strong"],
        ["--color-on-benefit", "--color-benefit"],
        ["--color-accent-strong", "--color-accent-soft"],
        ["--color-action-strong", "--color-action-soft"],
        ["--color-accent", "--color-accent-subtle"],
        ["--color-text-muted", "--color-accent-subtle"],
      ] as const;
      for (const [foreground, background] of pairs) {
        expect(
          contrastRatio(vars[foreground], vars[background]),
          `${palette.id}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const background of [brand.backgroundColor, brand.surfaceColor]) {
        for (const token of [
          "--color-text",
          "--color-text-muted",
          "--color-accent",
          "--color-action",
          "--color-focus",
          "--color-danger",
          "--color-success",
          "--color-warning",
        ] as const) {
          expect(
            contrastRatio(vars[token], background),
            `${palette.id}: ${token} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(vars["--color-danger-fill"]).toBe("#bd2440");
      const seed = createDemoState(DEFAULT_BRAND_PROFILE);
      const withCart = updateDemo(seed, {
        type: "quantity",
        id: seed.products[0].id,
        quantity: 2,
      });
      const updated = updateDemo(withCart, { type: "brand", brand });
      const restored = restoreDemo(JSON.stringify(updated), seed);
      expect(matchingPalette(restored.brand)?.id).toBe(palette.id);
      expect(restored.cart).toEqual(withCart.cart);
      expect(restored.products).toEqual(seed.products);
    },
  );

  it("changes only colors, preserves identity and leaves the original profile untouched", () => {
    const brand = {
      ...DEFAULT_BRAND_PROFILE,
      displayName: "Mi tienda",
      logoUrl: "/mi-logo.png",
      heroTitle: "Mi portada",
      tagline: "Mi eslogan",
    };
    const snapshot = { ...brand };
    for (const palette of STORE_PALETTES) {
      const updated = applyPalette(brand, palette);
      for (const key of Object.keys(brand) as (keyof typeof brand)[]) {
        if (!(PALETTE_KEYS as readonly string[]).includes(key))
          expect(updated[key]).toEqual(brand[key]);
      }
    }
    expect(brand).toEqual(snapshot);
  });

  it("recognizes all five colors case-insensitively and detects custom combinations", () => {
    const brand = applyPalette(DEFAULT_BRAND_PROFILE, STORE_PALETTES[0]);
    expect(
      matchingPalette({
        ...brand,
        primaryColor: brand.primaryColor.toUpperCase(),
      })?.id,
    ).toBe("mercado");
    expect(
      matchingPalette({ ...brand, surfaceColor: "#fffeff" }),
    ).toBeUndefined();
    expect(
      matchingPalette({ ...brand, secondaryColor: "#123456" }),
    ).toBeUndefined();
  });
});
