import type { BrandProfile } from "../application/brand-profile";

const SEEDED_AT = "2026-09-05T00:00:00.000Z";

/** Default white-label demo used by the existing `/loyalty` route. */
export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  id: "mercado-fresco",
  slug: "mercado-fresco",
  displayName: "Mercado Fresco",
  tagline: "Tu mercado de todos los días",
  logoUrl: "",
  primaryColor: "#164e3d",
  secondaryColor: "#d8f35f",
  accentColor: "#ff6636",
  backgroundColor: "#f6f7f2",
  surfaceColor: "#ffffff",
  heroTitle: "Fresco, fácil y con recompensas.",
  heroSubtitle:
    "Llena tu carrito con productos de calidad y gana beneficios en cada compra.",
  active: true,
  updatedAt: SEEDED_AT,
};

/** A visibly different preset proves that the demo is truly themeable. */
export const CIRIX_MARKET_PROFILE: BrandProfile = {
  id: "cirix-market",
  slug: "cirix-market",
  displayName: "Cirix Market",
  tagline: "Compras inteligentes, clientes leales",
  logoUrl: "/brand/cirix-logo.png",
  primaryColor: "#051934",
  secondaryColor: "#1c5aae",
  accentColor: "#e5002b",
  backgroundColor: "#f3f6fb",
  surfaceColor: "#ffffff",
  heroTitle: "Tu compra de siempre, ahora te recompensa.",
  heroSubtitle:
    "Compra productos frescos, acumula saldo y desbloquea ofertas creadas para ti.",
  active: true,
  updatedAt: SEEDED_AT,
};

export const BRAND_PROFILE_SEED = [DEFAULT_BRAND_PROFILE, CIRIX_MARKET_PROFILE];

export function findSeedBrand(slug: string): BrandProfile | null {
  return BRAND_PROFILE_SEED.find((profile) => profile.slug === slug) ?? null;
}
