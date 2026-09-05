import type { Firestore } from "firebase-admin/firestore";
import type {
  BrandProfile,
  SaveBrandProfileInput,
} from "../application/brand-profile";

const COLLECTION = "brandProfiles";

type BrandProfileDocument = Omit<BrandProfile, "id">;

/** Firestore adapter for operator-managed white-label storefront profiles. */
export class FirestoreBrandProfileRepository {
  private seeded: Promise<void> | null = null;

  constructor(
    private readonly firestore: Firestore,
    private readonly seed: BrandProfile[]
  ) {}

  async findBySlug(slug: string): Promise<BrandProfile | null> {
    await this.ensureSeeded();
    const snapshot = await this.firestore.collection(COLLECTION).doc(slug).get();
    if (!snapshot.exists) return null;
    return this.restore(snapshot.id, snapshot.data() as BrandProfileDocument);
  }

  async findAll(): Promise<BrandProfile[]> {
    await this.ensureSeeded();
    const snapshot = await this.firestore.collection(COLLECTION).orderBy("displayName").get();
    return snapshot.docs.map((doc) =>
      this.restore(doc.id, doc.data() as BrandProfileDocument)
    );
  }

  async save(input: SaveBrandProfileInput): Promise<BrandProfile> {
    await this.ensureSeeded();
    const previousId = input.id?.trim();
    if (previousId && previousId !== input.slug) {
      throw new Error(
        "El identificador de URL no puede cambiar después de guardar la marca."
      );
    }
    const profile: BrandProfile = {
      ...input,
      id: input.slug,
      updatedAt: new Date().toISOString(),
    };
    const target = this.firestore.collection(COLLECTION).doc(profile.slug);
    if (previousId !== profile.slug && (await target.get()).exists) {
      throw new Error("Ya existe una marca con ese identificador de URL.");
    }
    await target.set(this.toDocument(profile));

    return profile;
  }

  private ensureSeeded(): Promise<void> {
    this.seeded ??= (async () => {
      const collection = this.firestore.collection(COLLECTION);
      const existing = await collection.limit(1).get();
      if (!existing.empty) return;

      const batch = this.firestore.batch();
      for (const profile of this.seed) {
        batch.set(collection.doc(profile.slug), this.toDocument(profile));
      }
      await batch.commit();
    })();
    return this.seeded;
  }

  private restore(id: string, document: BrandProfileDocument): BrandProfile {
    return { id, ...document };
  }

  private toDocument(profile: BrandProfile): BrandProfileDocument {
    return {
      slug: profile.slug,
      displayName: profile.displayName,
      tagline: profile.tagline,
      logoUrl: profile.logoUrl,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
      accentColor: profile.accentColor,
      backgroundColor: profile.backgroundColor,
      surfaceColor: profile.surfaceColor,
      heroTitle: profile.heroTitle,
      heroSubtitle: profile.heroSubtitle,
      active: profile.active,
      updatedAt: profile.updatedAt,
    };
  }
}
