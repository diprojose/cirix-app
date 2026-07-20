import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { LedgerEntryId } from "../value-objects/ledger-entry-id";
import { isRewardReason, type RewardReason } from "../value-objects/reward-reason";
import {
  canTransition,
  isLedgerStatus,
  type LedgerStatus,
} from "../value-objects/ledger-status";
import {
  CorruptLedgerSnapshotError,
  InvalidAdjustmentError,
  InvalidLedgerEntryError,
  InvalidLedgerTransitionError,
} from "../errors/rewards-errors";

const MAX_NOTE_LENGTH = 300;

/** Props backing a {@link LedgerEntry} aggregate. */
type LedgerEntryProps = {
  customerUid: string;
  amountCents: number;
  reason: RewardReason;
  status: LedgerStatus;
  sourceType: string;
  sourceId: string | null;
  holdbackUntil: string | null;
  expiresAt: string | null;
  note: string;
  createdAt: string;
};

/** Input accepted by {@link LedgerEntry.restore} when rehydrating persistence. */
export type RestoreLedgerEntryInput = {
  id: string;
  customerUid: string;
  amountCents: number;
  reason: string;
  status: string;
  sourceType: string;
  sourceId: string | null;
  holdbackUntil: string | null;
  expiresAt: string | null;
  note: string;
  createdAt: string;
};

/**
 * LedgerEntry is the aggregate root of the rewards context: one immutable line
 * in the customer's append-only wallet ledger (BR-13). Its economic content —
 * signed amount, reason, source — is fixed at creation; only its `status`
 * advances through the lifecycle (pending → available → expired/reversed).
 * Earning, spending, refunding and adjusting each append their own line rather
 * than editing an existing one, so the ledger is always a full, auditable
 * history and the balance is simply the fold of its lines.
 */
export class LedgerEntry extends AggregateRoot<LedgerEntryProps, LedgerEntryId> {
  private constructor(id: LedgerEntryId, props: LedgerEntryProps) {
    super(id, props);
  }

  /**
   * Credit earned from a confirmed order's margin (BR-01). Born `pending` with a
   * holdback window (BR-02) and an expiry (BR-04). Keyed by the order so a
   * repeated confirmation cannot earn twice (BR-11).
   */
  static earn(input: {
    customerUid: string;
    amountCents: number;
    orderId: string;
    holdbackUntil: string;
    expiresAt: string;
  }): Result<LedgerEntry, DomainError> {
    const uid = input.customerUid.trim();
    if (uid.length === 0) {
      return err(new InvalidLedgerEntryError("A ledger line requires a customer uid."));
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return err(new InvalidLedgerEntryError("Earned credit must be a positive integer of cents."));
    }
    return ok(
      new LedgerEntry(LedgerEntryId.forEarn(input.orderId), {
        customerUid: uid,
        amountCents: input.amountCents,
        reason: "earn_purchase",
        status: "pending",
        sourceType: "order",
        sourceId: input.orderId,
        holdbackUntil: input.holdbackUntil,
        expiresAt: input.expiresAt,
        note: "",
        createdAt: new Date().toISOString(),
      })
    );
  }

  /**
   * Credit spent on a future order (BR-03): a negative line, settled on
   * creation. Keyed by the order so one order carries at most one redemption.
   */
  static burn(input: {
    customerUid: string;
    amountCents: number;
    orderId: string;
  }): Result<LedgerEntry, DomainError> {
    const uid = input.customerUid.trim();
    if (uid.length === 0) {
      return err(new InvalidLedgerEntryError("A ledger line requires a customer uid."));
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return err(new InvalidLedgerEntryError("Redeemed credit must be a positive integer of cents."));
    }
    return ok(
      new LedgerEntry(LedgerEntryId.forBurn(input.orderId), {
        customerUid: uid,
        amountCents: -input.amountCents,
        reason: "burn_redemption",
        status: "available",
        sourceType: "order",
        sourceId: input.orderId,
        holdbackUntil: null,
        expiresAt: null,
        note: "",
        createdAt: new Date().toISOString(),
      })
    );
  }

  /**
   * An operator credit (positive) or debit (negative) for customer service. The
   * reason note is mandatory so every manual move is explainable (US-G3).
   */
  static manualAdjustment(input: {
    customerUid: string;
    amountCents: number;
    note: string;
  }): Result<LedgerEntry, DomainError> {
    const uid = input.customerUid.trim();
    if (uid.length === 0) {
      return err(new InvalidLedgerEntryError("A ledger line requires a customer uid."));
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
      return err(new InvalidAdjustmentError("An adjustment must be a non-zero integer of cents."));
    }
    const note = input.note.trim();
    if (note.length === 0) {
      return err(new InvalidAdjustmentError("A manual adjustment requires a reason."));
    }
    return ok(
      new LedgerEntry(LedgerEntryId.generate(), {
        customerUid: uid,
        amountCents: input.amountCents,
        reason: "manual_adjustment",
        status: "available",
        sourceType: "manual",
        sourceId: null,
        holdbackUntil: null,
        expiresAt: null,
        note: note.slice(0, MAX_NOTE_LENGTH),
        createdAt: new Date().toISOString(),
      })
    );
  }

  /**
   * Rebuilds a line from a persisted snapshot, revalidating the enum fields so a
   * corrupt document surfaces as an error the adapter can report.
   */
  static restore(input: RestoreLedgerEntryInput): Result<LedgerEntry, DomainError> {
    if (!isRewardReason(input.reason)) {
      return err(new CorruptLedgerSnapshotError(`Unknown reward reason "${input.reason}".`));
    }
    if (!isLedgerStatus(input.status)) {
      return err(new CorruptLedgerSnapshotError(`Unknown ledger status "${input.status}".`));
    }
    if (!Number.isInteger(input.amountCents)) {
      return err(new CorruptLedgerSnapshotError("Ledger amount must be an integer of cents."));
    }
    return ok(
      new LedgerEntry(LedgerEntryId.from(input.id), {
        customerUid: input.customerUid,
        amountCents: input.amountCents,
        reason: input.reason,
        status: input.status,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        holdbackUntil: input.holdbackUntil,
        expiresAt: input.expiresAt,
        note: input.note,
        createdAt: input.createdAt,
      })
    );
  }

  /** Releases a held line once its holdback has passed (BR-02). */
  release(): Result<LedgerEntry, DomainError> {
    return this.transitionTo("available");
  }

  /** Expires an unused available line (BR-04). */
  expire(): Result<LedgerEntry, DomainError> {
    return this.transitionTo("expired");
  }

  /** Reverses a line clawed back by a refund or fraud decision (BR-12). */
  reverse(): Result<LedgerEntry, DomainError> {
    return this.transitionTo("reversed");
  }

  /** Moves to the given status when the lifecycle allows it; content is untouched. */
  private transitionTo(next: LedgerStatus): Result<LedgerEntry, DomainError> {
    if (!canTransition(this.props.status, next)) {
      return err(new InvalidLedgerTransitionError(this.props.status, next));
    }
    return ok(new LedgerEntry(this._id, { ...this.props, status: next }));
  }

  get customerUid(): string {
    return this.props.customerUid;
  }

  /** Signed amount in minor units: positive for credit, negative for debit. */
  get amountCents(): number {
    return this.props.amountCents;
  }

  get reason(): RewardReason {
    return this.props.reason;
  }

  get status(): LedgerStatus {
    return this.props.status;
  }

  get sourceType(): string {
    return this.props.sourceType;
  }

  get sourceId(): string | null {
    return this.props.sourceId;
  }

  get holdbackUntil(): string | null {
    return this.props.holdbackUntil;
  }

  get expiresAt(): string | null {
    return this.props.expiresAt;
  }

  get note(): string {
    return this.props.note;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  /** This line's contribution to the spendable balance (0 unless available). */
  get availableCents(): number {
    return this.props.status === "available" ? this.props.amountCents : 0;
  }

  /** This line's contribution to the pending balance (only held earn lines). */
  get pendingCents(): number {
    return this.props.reason === "earn_purchase" && this.props.status === "pending"
      ? this.props.amountCents
      : 0;
  }

  /** Whether this held line is due for release at the given instant. */
  isReleasableAt(nowIso: string): boolean {
    return (
      this.props.status === "pending" &&
      this.props.holdbackUntil !== null &&
      this.props.holdbackUntil <= nowIso
    );
  }

  /** Whether this available earn line has reached its expiry at the given instant. */
  isExpirableAt(nowIso: string): boolean {
    return (
      this.props.status === "available" &&
      this.props.reason === "earn_purchase" &&
      this.props.expiresAt !== null &&
      this.props.expiresAt <= nowIso
    );
  }
}
