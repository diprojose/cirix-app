import type { Firestore } from "firebase-admin/firestore";
import { PremiumRequest, type PremiumRequestStatus } from "../../domain/entities/premium-request";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";

/** Firestore collection holding one document per premium request. */
const COLLECTION = "premiumRequests";

/** The Firestore shape of a premium request (id keys the document). */
type PremiumRequestDocument = {
  uid: string;
  email: string;
  requestedAt: string;
  status: PremiumRequestStatus;
  payment: { method: string; reference: string } | null;
};

/**
 * FirestorePremiumRequestRepository is the production adapter for the
 * {@link PremiumRequestRepository} port, so upgrade requests survive deploys
 * and feed the operator's queue. Queries use equality filters only (no
 * composite indexes needed); ordering happens in memory.
 */
export class FirestorePremiumRequestRepository implements PremiumRequestRepository {
  constructor(private readonly firestore: Firestore) {}

  async save(request: PremiumRequest): Promise<void> {
    const document: PremiumRequestDocument = {
      uid: request.uid,
      email: request.email,
      requestedAt: request.requestedAt.toISOString(),
      status: request.status,
      payment: request.payment,
    };
    await this.firestore.collection(COLLECTION).doc(request.id.value).set(document);
  }

  async findById(id: string): Promise<PremiumRequest | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.restore(snapshot.id, snapshot.data() as PremiumRequestDocument);
  }

  async findPendingByUid(uid: string): Promise<PremiumRequest | null> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("uid", "==", uid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return this.restore(doc.id, doc.data() as PremiumRequestDocument);
  }

  async findAllPending(): Promise<PremiumRequest[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .limit(200)
      .get();
    return snapshot.docs
      .map((doc) => this.restore(doc.id, doc.data() as PremiumRequestDocument))
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
  private restore(id: string, document: PremiumRequestDocument): PremiumRequest {
    const result = PremiumRequest.create({
      id,
      uid: document.uid,
      email: document.email,
      requestedAt: new Date(document.requestedAt),
      status: document.status,
      payment: document.payment ?? null,
    });
    if (!result.ok) {
      throw new Error(`Corrupt premium request "${id}": ${result.error.message}`);
    }
    return result.value;
  }
}
