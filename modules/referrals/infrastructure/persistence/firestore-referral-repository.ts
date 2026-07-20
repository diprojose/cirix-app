import type { Firestore } from "firebase-admin/firestore";
import { Referral } from "../../domain/entities/referral";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";

/** One document per referral, keyed by the referred user's uid (one per user). */
const COLLECTION = "referrals";

/** The Firestore shape of a referral (everything but the referred uid, which keys the doc). */
type ReferralDocument = {
  referrerUid: string;
  state: string;
  firstPurchaseOrderId: string | null;
  secondPurchaseOrderId: string | null;
  firstPurchaseAt: string | null;
  secondPurchaseAt: string | null;
  rewardCents: number | null;
  createdAt: string;
};

/**
 * FirestoreReferralRepository is the production adapter for the
 * {@link ReferralRepository} port, backed by the Firebase Admin SDK
 * (server-only). Keying by the referred uid makes the per-buyer lookup a direct
 * `get`; the referrer and second-purchase lookups filter on a single indexed
 * field, keeping Firestore free of composite indexes.
 */
export class FirestoreReferralRepository implements ReferralRepository {
  constructor(private readonly firestore: Firestore) {}

  async findByReferred(referredUid: string): Promise<Referral | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(referredUid).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.id, snapshot.data() as ReferralDocument);
  }

  async findByReferrer(referrerUid: string): Promise<Referral[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("referrerUid", "==", referrerUid)
      .limit(500)
      .get();
    return snapshot.docs.map((doc) => restore(doc.id, doc.data() as ReferralDocument));
  }

  async findBySecondPurchaseOrder(orderId: string): Promise<Referral | null> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("secondPurchaseOrderId", "==", orderId)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? restore(doc.id, doc.data() as ReferralDocument) : null;
  }

  async save(referral: Referral): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(referral.referredUid)
      .set(toDocument(referral));
  }
}

/** Serializes a Referral aggregate into its Firestore document. */
function toDocument(referral: Referral): ReferralDocument {
  return {
    referrerUid: referral.referrerUid,
    state: referral.state,
    firstPurchaseOrderId: referral.firstPurchaseOrderId,
    secondPurchaseOrderId: referral.secondPurchaseOrderId,
    firstPurchaseAt: referral.firstPurchaseAt,
    secondPurchaseAt: referral.secondPurchaseAt,
    rewardCents: referral.rewardCents,
    createdAt: referral.createdAt,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(referredUid: string, document: ReferralDocument): Referral {
  const result = Referral.restore({ referredUid, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt referral document "${referredUid}": ${result.error.message}`);
  }
  return result.value;
}
