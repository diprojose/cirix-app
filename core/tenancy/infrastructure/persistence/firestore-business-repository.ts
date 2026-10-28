import type { Firestore } from "firebase-admin/firestore";
import { Business } from "../../domain/entities/business";
import type { BusinessId } from "../../domain/value-objects/business-id";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import { BusinessSlugTakenError, CorruptBusinessSnapshotError } from "../../domain/errors/tenancy-errors";

/** One document per business, keyed by business id. */
const BUSINESSES = "businesses";
/** One document per reserved slug, keyed by the slug itself: makes it unique. */
const SLUGS = "business_slugs";

/** How long a slug to id answer is reused. */
const SLUG_CACHE_MS = 10 * 60_000;

type BusinessDocument = {
  slug: string;
  name: string;
  kind: string;
  status: string;
  createdAt: string;
};

/**
 * FirestoreBusinessRepository is the production adapter for the
 * {@link BusinessRepository} port (Admin SDK, server-only). Slug uniqueness is
 * enforced by a transaction that reads and writes a document keyed by the slug,
 * so two simultaneous registrations cannot both succeed. Only single-field
 * equality queries are used, which need no composite index.
 */
export class FirestoreBusinessRepository implements BusinessRepository {
  /** Slug to id answers already read. Only found slugs are kept, so a new business is seen at once. */
  private readonly slugIds = new Map<string, { id: string; expiresAt: number }>();

  constructor(private readonly firestore: Firestore) {}

  async idForSlug(slug: string): Promise<string | null> {
    const cached = this.slugIds.get(slug);
    if (cached && cached.expiresAt > Date.now()) return cached.id;
    const snapshot = await this.firestore.collection(SLUGS).doc(slug).get();
    const id = snapshot.exists ? (snapshot.data() as { businessId?: string }).businessId ?? null : null;
    if (id === null) this.slugIds.delete(slug);
    else this.slugIds.set(slug, { id, expiresAt: Date.now() + SLUG_CACHE_MS });
    return id;
  }

  async findById(id: BusinessId): Promise<Business | null> {
    const snapshot = await this.firestore.collection(BUSINESSES).doc(id.value).get();
    return snapshot.exists ? restore(snapshot.id, snapshot.data() as BusinessDocument) : null;
  }

  async findBySlug(slug: string): Promise<Business | null> {
    const snapshot = await this.firestore
      .collection(BUSINESSES)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? restore(doc.id, doc.data() as BusinessDocument) : null;
  }

  async findByIds(ids: readonly string[]): Promise<Business[]> {
    if (ids.length === 0) return [];
    const refs = ids.map((id) => this.firestore.collection(BUSINESSES).doc(id));
    const snapshots = await this.firestore.getAll(...refs);
    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => restore(snapshot.id, snapshot.data() as BusinessDocument));
  }

  async create(business: Business): Promise<void> {
    const slugRef = this.firestore.collection(SLUGS).doc(business.slug.value);
    const businessRef = this.firestore.collection(BUSINESSES).doc(business.id.value);
    await this.firestore.runTransaction(async (transaction) => {
      if ((await transaction.get(slugRef)).exists) {
        throw new BusinessSlugTakenError(business.slug.value);
      }
      transaction.set(slugRef, { businessId: business.id.value });
      transaction.set(businessRef, {
        slug: business.slug.value,
        name: business.name,
        kind: business.kind,
        status: business.status,
        createdAt: business.createdAt,
      } satisfies BusinessDocument);
    });
  }
}

function restore(id: string, data: BusinessDocument): Business {
  const result = Business.restore({ id, ...data });
  if (!result.ok) throw new CorruptBusinessSnapshotError(`Business ${id}: ${result.error.message}`);
  return result.value;
}
