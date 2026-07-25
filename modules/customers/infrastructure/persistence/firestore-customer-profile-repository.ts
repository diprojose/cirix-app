import type { Firestore } from "firebase-admin/firestore";
import { CustomerProfile } from "../../domain/entities/customer-profile";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";

/** One document per customer retention profile, keyed by uid. */
const COLLECTION = "customer_profiles";

/** The Firestore shape of a profile (everything but the uid, which keys the doc). */
type CustomerProfileDocument = {
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
  segment: string;
  streakWeeks: number;
  streakLastWeek: number | null;
  winBackSentAt: string | null;
  createdAt: string;
};

/**
 * FirestoreCustomerProfileRepository is the production adapter for the
 * {@link CustomerProfileRepository} port, backed by the Firebase Admin SDK
 * (server-only). Profiles are small and few (one per signed-in customer), so the
 * retention jobs read the whole collection with a single bounded query.
 */
export class FirestoreCustomerProfileRepository implements CustomerProfileRepository {
  constructor(private readonly firestore: Firestore) {}

  async findByUid(uid: string): Promise<CustomerProfile | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(uid).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.id, snapshot.data() as CustomerProfileDocument);
  }

  async findAll(limit: number): Promise<CustomerProfile[]> {
    const snapshot = await this.firestore.collection(COLLECTION).limit(limit).get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as CustomerProfileDocument));
  }

  async save(profile: CustomerProfile): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(profile.uid).set(toDocument(profile));
  }
}

/** Serializes a CustomerProfile aggregate into its Firestore document. */
function toDocument(profile: CustomerProfile): CustomerProfileDocument {
  return {
    orderCount: profile.orderCount,
    totalSpentCents: profile.totalSpentCents,
    lastOrderAt: profile.lastOrderAt,
    segment: profile.segment,
    streakWeeks: profile.streakWeeks,
    streakLastWeek: profile.streakLastWeek,
    winBackSentAt: profile.winBackSentAt,
    createdAt: profile.createdAt,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(uid: string, document: CustomerProfileDocument): CustomerProfile {
  const result = CustomerProfile.restore({ uid, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt customer profile "${uid}": ${result.error.message}`);
  }
  return result.value;
}
