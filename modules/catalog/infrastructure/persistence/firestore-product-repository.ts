import type { Firestore } from "firebase-admin/firestore";
import { Product } from "../../domain/entities/product";
import type { ProductId } from "../../domain/value-objects/product-id";
import type { ProductRepository } from "../../domain/repositories/product-repository";

/** Firestore collection holding one document per product, keyed by product id. */
const COLLECTION = "products";

/** The Firestore shape of a product (everything but the id, which keys the doc). */
type ProductDocument = {
  name: string;
  description: string;
  priceCents: number;
  /** Optional: documents written before rewards default to 0 cost on restore. */
  costCents?: number;
  currency: string;
  department: string;
  imageUrl: string;
  featured: boolean;
  available: boolean;
};

/**
 * FirestoreProductRepository is the production adapter for the
 * {@link ProductRepository} port, backed by the Firebase Admin SDK (server-only).
 * On first use it seeds the collection with the initial catalog when it is
 * empty, so a fresh project starts with products instead of a blank store; the
 * check is memoised per server runtime. Filtering is done in memory after a
 * single bounded read — the catalog is small (an artisan shop, not a
 * marketplace), which keeps Firestore free of composite indexes.
 */
export class FirestoreProductRepository implements ProductRepository {
  private seeded: Promise<void> | null = null;

  constructor(
    private readonly firestore: Firestore,
    private readonly seed: Product[] = []
  ) {}

  async findById(id: ProductId): Promise<Product | null> {
    await this.ensureSeeded();
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.restore(snapshot.id, snapshot.data() as ProductDocument);
  }

  async findAllAvailable(): Promise<Product[]> {
    return (await this.findAll()).filter((product) => product.isAvailable);
  }

  async findAllFeatured(): Promise<Product[]> {
    return (await this.findAll()).filter(
      (product) => product.isAvailable && product.isFeatured
    );
  }

  async findAll(): Promise<Product[]> {
    await this.ensureSeeded();
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .orderBy("name")
      .limit(500)
      .get();
    return snapshot.docs.map((doc) =>
      this.restore(doc.id, doc.data() as ProductDocument)
    );
  }

  async save(product: Product): Promise<void> {
    await this.ensureSeeded();
    await this.firestore
      .collection(COLLECTION)
      .doc(product.id.value)
      .set(toDocument(product));
  }

  async delete(id: ProductId): Promise<void> {
    await this.ensureSeeded();
    await this.firestore.collection(COLLECTION).doc(id.value).delete();
  }

  /** Seeds the collection with the initial catalog when it is empty (once per runtime). */
  private ensureSeeded(): Promise<void> {
    this.seeded ??= (async () => {
      if (this.seed.length === 0) {
        return;
      }
      const existing = await this.firestore.collection(COLLECTION).limit(1).get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const product of this.seed) {
        batch.set(
          this.firestore.collection(COLLECTION).doc(product.id.value),
          toDocument(product)
        );
      }
      await batch.commit();
    })();
    return this.seeded;
  }

  /** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
  private restore(id: string, document: ProductDocument): Product {
    const result = Product.create({ id, ...document });
    if (!result.ok) {
      throw new Error(`Corrupt product document "${id}": ${result.error.message}`);
    }
    return result.value;
  }
}

/** Serializes a Product aggregate into its Firestore document. */
function toDocument(product: Product): ProductDocument {
  return {
    name: product.name,
    description: product.description,
    priceCents: product.price.amountCents,
    costCents: product.costCents,
    currency: product.price.currency,
    department: product.department.value,
    imageUrl: product.imageUrl,
    featured: product.isFeatured,
    available: product.isAvailable,
  };
}
