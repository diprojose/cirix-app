import { supportsSharedReadableText } from "./color-contrast";

/**
 * Public, serializable configuration for one white-label storefront.
 * Components consume semantic theme tokens derived from this profile instead
 * of coupling themselves to a customer's literal palette.
 */
export type BrandProfile = {
  id: string;
  slug: string;
  displayName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  heroTitle: string;
  heroSubtitle: string;
  active: boolean;
  updatedAt: string;
};

export type SaveBrandProfileInput = Omit<BrandProfile, "id" | "updatedAt"> & {
  id?: string;
};

export type BrandProfileValidation =
  | { ok: true; value: SaveBrandProfileInput }
  | { ok: false; error: string };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normalizes and validates operator input at the application boundary. */
export function validateBrandProfile(
  input: SaveBrandProfileInput
): BrandProfileValidation {
  const value: SaveBrandProfileInput = {
    ...input,
    id: input.id?.trim() || undefined,
    slug: input.slug.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    tagline: input.tagline.trim(),
    logoUrl: input.logoUrl.trim(),
    heroTitle: input.heroTitle.trim(),
    heroSubtitle: input.heroSubtitle.trim(),
    primaryColor: input.primaryColor.trim().toLowerCase(),
    secondaryColor: input.secondaryColor.trim().toLowerCase(),
    accentColor: input.accentColor.trim().toLowerCase(),
    backgroundColor: input.backgroundColor.trim().toLowerCase(),
    surfaceColor: input.surfaceColor.trim().toLowerCase(),
  };

  if (!SLUG.test(value.slug) || value.slug.length > 48) {
    return {
      ok: false,
      error: "El identificador debe usar solo letras minúsculas, números y guiones.",
    };
  }
  if (!value.displayName || value.displayName.length > 60) {
    return { ok: false, error: "El nombre de marca es obligatorio (máximo 60 caracteres)." };
  }
  if (!value.heroTitle || value.heroTitle.length > 90) {
    return { ok: false, error: "El título principal es obligatorio (máximo 90 caracteres)." };
  }
  if (value.heroSubtitle.length > 180 || value.tagline.length > 100) {
    return { ok: false, error: "El texto de marca es demasiado largo." };
  }

  const colors = [
    value.primaryColor,
    value.secondaryColor,
    value.accentColor,
    value.backgroundColor,
    value.surfaceColor,
  ];
  if (colors.some((color) => !HEX_COLOR.test(color))) {
    return { ok: false, error: "Todos los colores deben usar el formato hexadecimal #RRGGBB." };
  }

  if (!supportsSharedReadableText([value.backgroundColor, value.surfaceColor])) {
    return {
      ok: false,
      error:
        "Fondo y superficie deben ser ambos claros o ambos oscuros para mantener el texto legible.",
    };
  }

  if (
    value.logoUrl &&
    !(value.logoUrl.startsWith("/") && !value.logoUrl.startsWith("//")) &&
    !value.logoUrl.startsWith("https://")
  ) {
    return { ok: false, error: "El logo debe ser una ruta local o una URL https válida." };
  }

  return { ok: true, value };
}
