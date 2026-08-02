import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { AuditTrail } from "@/shared/application/audit-trail";
import { FirestoreAuditTrail } from "../persistence/firestore-audit-trail";

/*
 * Composition root for the audit module. The audit trail is cross-cutting, so
 * this container exposes the single concrete adapter to other composition roots
 * (rewards today; coupons, referrals and fraud later) which inject it into the
 * use cases that must record sensitive actions. Created lazily so importing the
 * container does not require Firebase credentials at build time.
 */

let auditTrail: AuditTrail | null = null;

/** The Firestore-backed audit trail, shared across contexts. */
export const getAuditTrail = (): AuditTrail => {
  auditTrail ??= new FirestoreAuditTrail(adminFirestore());
  return auditTrail;
};
