import type {
  BrandProfile,
  SaveBrandProfileInput,
} from "../application/brand-profile";

/** Process-local profile storage for development before Firebase is connected. */
export class InMemoryBrandProfileRepository {
  private readonly profiles: Map<string, BrandProfile>;

  constructor(seed: BrandProfile[]) {
    const runtime = globalThis as typeof globalThis & {
      __mixmagDemoBrands?: Map<string, BrandProfile>;
    };
    runtime.__mixmagDemoBrands ??= new Map(
      seed.map((profile) => [profile.slug, { ...profile }])
    );
    this.profiles = runtime.__mixmagDemoBrands;
  }

  async findBySlug(slug: string): Promise<BrandProfile | null> {
    return this.profiles.get(slug) ?? null;
  }

  async findAll(): Promise<BrandProfile[]> {
    return [...this.profiles.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName)
    );
  }

  async save(input: SaveBrandProfileInput): Promise<BrandProfile> {
    const previousId = input.id?.trim();
    if (previousId && previousId !== input.slug) {
      throw new Error(
        "El identificador de URL no puede cambiar después de guardar la marca."
      );
    }
    if (previousId !== input.slug && this.profiles.has(input.slug)) {
      throw new Error("Ya existe una marca con ese identificador de URL.");
    }

    const profile: BrandProfile = {
      ...input,
      id: input.slug,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(profile.slug, profile);
    return profile;
  }
}
