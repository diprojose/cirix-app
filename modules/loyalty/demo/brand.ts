import "server-only";
import { findSeedBrand } from "../branding/infrastructure/brand-profile-seed";
import { getBrandProfile } from "../branding/infrastructure/branding-container";

/** Built-in demos never need Firebase. Existing custom brand links still work. */
export async function getDemoBrand(slug: string) {
  return findSeedBrand(slug) ?? getBrandProfile(slug);
}
