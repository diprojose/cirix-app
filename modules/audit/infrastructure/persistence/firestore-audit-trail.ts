import type { Firestore } from "firebase-admin/firestore";
import type { AuditRecord, AuditTrail } from "@/shared/application/audit-trail";
import { AuditEntry } from "../../domain/entities/audit-entry";

/** Firestore collection holding one append-only document per audit entry. */
const COLLECTION = "audit_log";

/** The Firestore shape of an audit entry (everything but the id, which keys the doc). */
type AuditEntryDocument = {
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

/**
 * FirestoreAuditTrail is the production adapter for the {@link AuditTrail} port,
 * backed by the Firebase Admin SDK (server-only). Each `record` writes a brand
 * new document keyed by a fresh id, so entries only ever accumulate — the
 * adapter offers no update or delete path, honoring the immutable-log rule
 * (BR-19).
 */
export class FirestoreAuditTrail implements AuditTrail {
  constructor(private readonly firestore: Firestore) {}

  async record(record: AuditRecord): Promise<void> {
    const entry = AuditEntry.record(record);
    const document: AuditEntryDocument = {
      actorId: entry.actorId,
      action: entry.action,
      // Firestore rejects `undefined`; the entity already normalizes to null.
      before: entry.before ?? null,
      after: entry.after ?? null,
      createdAt: entry.createdAt,
    };
    await this.firestore.collection(COLLECTION).doc(entry.id.value).set(document);
  }
}
