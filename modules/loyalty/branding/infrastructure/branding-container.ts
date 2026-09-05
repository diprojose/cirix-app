import { cache } from "react";
import {
  adminFirestore,
  hasFirebaseAdminConfig,
} from "@/shared/infrastructure/firebase-admin";
import type {
  BrandProfile,
  SaveBrandProfileInput,
} from "../application/brand-profile";
import { FirestoreBrandProfileRepository } from "./brand-profile-repository";
import { InMemoryBrandProfileRepository } from "./in-memory-brand-profile-repository";
import {
  BRAND_PROFILE_SEED,
  DEFAULT_BRAND_PROFILE,
  findSeedBrand,
} from "./brand-profile-seed";

type BrandProfileRepository = {
  findBySlug(slug: string): Promise<BrandProfile | null>;
  findAll(): Promise<BrandProfile[]>;
  save(input: SaveBrandProfileInput): Promise<BrandProfile>;
};

let brandRepository: BrandProfileRepository | null = null;

function repository(): BrandProfileRepository {
  brandRepository ??= hasFirebaseAdminConfig()
    ? new FirestoreBrandProfileRepository(adminFirestore(), BRAND_PROFILE_SEED)
    : new InMemoryBrandProfileRepository(BRAND_PROFILE_SEED);
  return brandRepository;
}

/** Cached per request so metadata, viewport and layout share one database read. */
export const getBrandProfile = cache(async (slug: string) => {
  try {
    const profile = await repository().findBySlug(slug);
    if (profile || hasFirebaseAdminConfig()) return profile;
    return findSeedBrand(slug);
  } catch {
    // Built-in demos stay available while a new environment is being wired to
    // Firebase; operator-created profiles still require durable persistence.
    return findSeedBrand(slug);
  }
});

export async function listBrandProfiles() {
  try {
    return await repository().findAll();
  } catch {
    return BRAND_PROFILE_SEED;
  }
}

export async function saveBrandProfile(input: SaveBrandProfileInput) {
  return repository().save(input);
}

export function getDefaultBrandProfile() {
  return DEFAULT_BRAND_PROFILE;
}
