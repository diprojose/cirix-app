/**
 * One sensitive action to record in the immutable audit trail: who did it
 * (`actorId`), a stable `action` slug, and the before/after snapshots so the
 * change is fully reconstructable. Snapshots are plain, JSON-serializable data
 * (or `null` when not applicable) so any adapter can persist them as-is.
 */
export type AuditRecord = {
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
};

/**
 * AuditTrail is the cross-cutting outbound port for append-only auditing
 * (BR-19). It lives in the shared kernel because several bounded contexts
 * (rewards today; coupons, referrals and fraud later) must record sensitive
 * actions without each declaring its own logging contract. Application code
 * depends on this interface; a single infrastructure adapter implements it.
 */
export interface AuditTrail {
  /** Appends one audit entry. Never edits or removes prior entries. */
  record(entry: AuditRecord): Promise<void>;
}
