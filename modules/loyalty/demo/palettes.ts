import type { BrandProfile } from "../branding/application/brand-profile";
import {
  DEFAULT_BRAND_PROFILE,
  CIRIX_MARKET_PROFILE,
} from "../branding/infrastructure/brand-profile-seed";

export const PALETTE_KEYS = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "surfaceColor",
] as const;

type PaletteColors = Pick<BrandProfile, (typeof PALETTE_KEYS)[number]>;
export type PaletteFamily = "natural" | "warm" | "vivid" | "dark";
export type StorePalette = {
  id: string;
  name: { es: string; en: string };
  description: { es: string; en: string };
  family: PaletteFamily;
  colors: PaletteColors;
};

function colors(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  backgroundColor: string,
  surfaceColor = "#ffffff",
): PaletteColors {
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    surfaceColor,
  };
}

function fromProfile(profile: BrandProfile): PaletteColors {
  return colors(
    profile.primaryColor,
    profile.secondaryColor,
    profile.accentColor,
    profile.backgroundColor,
    profile.surfaceColor,
  );
}

/** Only color fields belong to a palette; applying one never replaces brand identity. */
export const STORE_PALETTES: readonly StorePalette[] = [
  {
    id: "mercado",
    name: { es: "Mercado", en: "Market" },
    description: {
      es: "Bosque, lima y frescura",
      en: "Forest, lime and freshness",
    },
    family: "natural",
    colors: fromProfile(DEFAULT_BRAND_PROFILE),
  },
  {
    id: "cirix",
    name: { es: "Cirix", en: "Cirix" },
    description: { es: "Azul profundo y energía", en: "Deep blue and energy" },
    family: "vivid",
    colors: fromProfile(CIRIX_MARKET_PROFILE),
  },
  {
    id: "oliva",
    name: { es: "Oliva", en: "Olive" },
    description: {
      es: "Natural, sobria y artesanal",
      en: "Natural, subtle and crafted",
    },
    family: "natural",
    colors: colors("#4b5131", "#e8dcb8", "#b95336", "#f8f5ed"),
  },
  {
    id: "salvia",
    name: { es: "Salvia", en: "Sage" },
    description: {
      es: "Verde suave y rosa arcilla",
      en: "Soft green and clay pink",
    },
    family: "natural",
    colors: colors("#31584d", "#d6e5ce", "#b85960", "#f3f6ef", "#fcfdf9"),
  },
  {
    id: "terracota",
    name: { es: "Terracota", en: "Terracotta" },
    description: {
      es: "Tierra, crema y calidez",
      en: "Earth, cream and warmth",
    },
    family: "warm",
    colors: colors("#873e2b", "#ead8b6", "#b45b18", "#faf3e9", "#fffdf8"),
  },
  {
    id: "azafran",
    name: { es: "Azafrán", en: "Saffron" },
    description: { es: "Curry, miel y ciruela", en: "Curry, honey and plum" },
    family: "warm",
    colors: colors("#704517", "#f2cc66", "#863e62", "#fbf7eb", "#fffef9"),
  },
  {
    id: "cacao",
    name: { es: "Cacao", en: "Cocoa" },
    description: {
      es: "Chocolate, avena y cobre",
      en: "Chocolate, oat and copper",
    },
    family: "warm",
    colors: colors("#4b322d", "#dec6a4", "#ae542d", "#f5f0e9", "#fffdf9"),
  },
  {
    id: "coral",
    name: { es: "Coral", en: "Coral" },
    description: {
      es: "Coral, durazno y petróleo",
      en: "Coral, peach and teal",
    },
    family: "warm",
    colors: colors("#a53f43", "#ffd1ab", "#176d72", "#fff4ef", "#fffdfb"),
  },
  {
    id: "oceano",
    name: { es: "Océano", en: "Ocean" },
    description: {
      es: "Petróleo, aqua y mandarina",
      en: "Teal, aqua and tangerine",
    },
    family: "vivid",
    colors: colors("#125b68", "#a9e4dc", "#df6934", "#eff8f8"),
  },
  {
    id: "mediterraneo",
    name: { es: "Mediterráneo", en: "Mediterranean" },
    description: {
      es: "Cobalto y amarillo limón",
      en: "Cobalt and lemon yellow",
    },
    family: "vivid",
    colors: colors("#234d9b", "#f5dc76", "#d7543a", "#f2f5fb"),
  },
  {
    id: "frambuesa",
    name: { es: "Frambuesa", en: "Raspberry" },
    description: { es: "Frutos rojos y menta", en: "Red berries and mint" },
    family: "vivid",
    colors: colors("#842747", "#c7e6d5", "#c66130", "#fbf1f5", "#fffdfd"),
  },
  {
    id: "lavanda",
    name: { es: "Lavanda", en: "Lavender" },
    description: {
      es: "Violeta, lila y albaricoque",
      en: "Violet, lilac and apricot",
    },
    family: "vivid",
    colors: colors("#59418a", "#ded3f3", "#b55332", "#f5f2fb", "#fefcff"),
  },
  {
    id: "carbon",
    name: { es: "Carbón", en: "Charcoal" },
    description: {
      es: "Grafito, marfil y ámbar",
      en: "Graphite, ivory and amber",
    },
    family: "dark",
    colors: colors("#e7dcc5", "#b5c9b1", "#f2ac62", "#171b1c", "#222829"),
  },
  {
    id: "bosque-noche",
    name: { es: "Bosque nocturno", en: "Night forest" },
    description: {
      es: "Pino oscuro y lima luminosa",
      en: "Dark pine and bright lime",
    },
    family: "dark",
    colors: colors("#bce477", "#9cdac4", "#f4ac81", "#101e19", "#1a2d25"),
  },
  {
    id: "azul-noche",
    name: { es: "Azul noche", en: "Midnight blue" },
    description: {
      es: "Marino, hielo y lavanda",
      en: "Navy, ice and lavender",
    },
    family: "dark",
    colors: colors("#accaff", "#d4c6f6", "#ffb398", "#111a2b", "#1c2940"),
  },
];

export function applyPalette(
  profile: BrandProfile,
  palette: StorePalette,
): BrandProfile {
  return {
    ...profile,
    ...Object.fromEntries(
      PALETTE_KEYS.map((key) => [key, palette.colors[key]]),
    ),
  };
}

export function matchingPalette(
  profile: BrandProfile,
): StorePalette | undefined {
  return STORE_PALETTES.find((palette) =>
    PALETTE_KEYS.every(
      (key) => palette.colors[key].toLowerCase() === profile[key].toLowerCase(),
    ),
  );
}
