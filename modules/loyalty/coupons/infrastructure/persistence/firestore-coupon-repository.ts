import type { Firestore } from "firebase-admin/firestore";
import { Coupon } from "../../domain/entities/coupon";
import type { CouponId } from "../../domain/value-objects/coupon-id";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";

/** Firestore collection holding one document per coupon, keyed by coupon id. */
const COLLECTION = "coupons";

/** The Firestore shape of a coupon (everything but the id, which keys the doc). */
type CouponDocument = {
  code: string;
  discountType: string;
  value: number;
  minSpendCents: number;
  categoryScope: string[];
  segmentScope: string | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  expiresAt: string | null;
  active: boolean;
};

/**
 * FirestoreCouponRepository is the production adapter for the
 * {@link CouponRepository} port, backed by the Firebase Admin SDK (server-only).
 * `findByCode` filters on the single indexed `code` field — codes are normalized
 * upper-case, so lookup is exact — keeping Firestore free of composite indexes.
 */
export class FirestoreCouponRepository implements CouponRepository {
  constructor(private readonly firestore: Firestore) {}

  async findById(id: CouponId): Promise<Coupon | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.id, snapshot.data() as CouponDocument);
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("code", "==", code)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? restore(doc.id, doc.data() as CouponDocument) : null;
  }

  async findAll(): Promise<Coupon[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .orderBy("code")
      .limit(500)
      .get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as CouponDocument));
  }

  async save(coupon: Coupon): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(coupon.id.value).set(toDocument(coupon));
  }

  async delete(id: CouponId): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(id.value).delete();
  }
}

/** Serializes a Coupon aggregate into its Firestore document. */
function toDocument(coupon: Coupon): CouponDocument {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    minSpendCents: coupon.minSpendCents,
    categoryScope: [...coupon.categoryScope],
    segmentScope: coupon.segmentScope,
    usageLimitPerCustomer: coupon.usageLimitPerCustomer,
    stackable: coupon.stackable,
    expiresAt: coupon.expiresAt,
    active: coupon.isActive,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(id: string, document: CouponDocument): Coupon {
  const result = Coupon.restore({ id, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt coupon document "${id}": ${result.error.message}`);
  }
  return result.value;
}
