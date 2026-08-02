import type { Firestore } from "firebase-admin/firestore";
import { FraudAlert } from "../../domain/entities/fraud-alert";
import type { FraudAlertId } from "../../domain/value-objects/fraud-alert-id";
import type { FraudAlertRepository } from "../../domain/repositories/fraud-alert-repository";

/** Firestore collection holding one document per fraud alert, keyed by id. */
const COLLECTION = "fraud_alerts";

/** The Firestore shape of a fraud alert (everything but the id, which keys the doc). */
type FraudAlertDocument = {
  subjectType: string;
  subjectId: string;
  signal: string;
  evidence: string;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

/**
 * FirestoreFraudAlertRepository is the production adapter for the
 * {@link FraudAlertRepository} port, backed by the Firebase Admin SDK
 * (server-only). The pending queue filters on the single indexed `status` field
 * and sorts in memory, keeping Firestore free of composite indexes.
 */
export class FirestoreFraudAlertRepository implements FraudAlertRepository {
  constructor(private readonly firestore: Firestore) {}

  async findById(id: FraudAlertId): Promise<FraudAlert | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.value).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.id, snapshot.data() as FraudAlertDocument);
  }

  async findPending(): Promise<FraudAlert[]> {
    const snapshot = await this.firestore
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .limit(200)
      .get();
    return snapshot.docs
      .map((doc) => restore(doc.id, doc.data() as FraudAlertDocument))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async save(alert: FraudAlert): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(alert.id.value).set(toDocument(alert));
  }
}

/** Serializes a FraudAlert aggregate into its Firestore document. */
function toDocument(alert: FraudAlert): FraudAlertDocument {
  return {
    subjectType: alert.subjectType,
    subjectId: alert.subjectId,
    signal: alert.signal,
    evidence: alert.evidence,
    status: alert.status,
    resolvedBy: alert.resolvedBy,
    resolvedAt: alert.resolvedAt,
    createdAt: alert.createdAt,
  };
}

/** Rebuilds the aggregate from a stored document, failing loudly on corrupt data. */
function restore(id: string, document: FraudAlertDocument): FraudAlert {
  const result = FraudAlert.restore({ id, ...document });
  if (!result.ok) {
    throw new Error(`Corrupt fraud alert "${id}": ${result.error.message}`);
  }
  return result.value;
}
