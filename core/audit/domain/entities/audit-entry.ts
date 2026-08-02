import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { AuditEntryId } from "../value-objects/audit-entry-id";

/** Props backing an {@link AuditEntry} aggregate. */
type AuditEntryProps = {
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

/** Input accepted by {@link AuditEntry.record}. */
export type RecordAuditEntryInput = {
  actorId: string;
  action: string;
  before: unknown;
  after: unknown;
};

/**
 * AuditEntry is the aggregate root of the audit context: a single, immutable
 * record of a sensitive action (a manual balance adjustment, a config change, a
 * fraud decision). Once created it is never edited or deleted — corrections are
 * new entries — which is what makes the trail trustworthy for compliance
 * (BR-19). The `action` slug is stable and machine-readable; `before`/`after`
 * carry plain snapshots so the change can be reconstructed.
 */
export class AuditEntry extends AggregateRoot<AuditEntryProps, AuditEntryId> {
  private constructor(id: AuditEntryId, props: AuditEntryProps) {
    super(id, props);
  }

  /** Stamps a new audit entry with a fresh id and the current time. */
  static record(input: RecordAuditEntryInput): AuditEntry {
    return new AuditEntry(AuditEntryId.generate(), {
      actorId: input.actorId.trim() || "unknown",
      action: input.action.trim(),
      before: input.before ?? null,
      after: input.after ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  get actorId(): string {
    return this.props.actorId;
  }

  get action(): string {
    return this.props.action;
  }

  get before(): unknown {
    return this.props.before;
  }

  get after(): unknown {
    return this.props.after;
  }

  /** ISO timestamp of when the action happened. */
  get createdAt(): string {
    return this.props.createdAt;
  }
}
