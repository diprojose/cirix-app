import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { FraudAlertId } from "../value-objects/fraud-alert-id";
import { isFraudStatus, type FraudStatus } from "../value-objects/fraud-status";
import {
  AlertAlreadyResolvedError,
  CorruptFraudAlertSnapshotError,
  InvalidFraudAlertError,
} from "../errors/fraud-errors";

const MAX_EVIDENCE_LENGTH = 500;

/** Props backing a {@link FraudAlert} aggregate. */
type FraudAlertProps = {
  subjectType: string;
  subjectId: string;
  signal: string;
  evidence: string;
  status: FraudStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

/** Input accepted by {@link FraudAlert.restore} when rehydrating persistence. */
export type RestoreFraudAlertInput = {
  id: string;
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
 * FraudAlert is the aggregate root of the fraud context: a flag raised on a
 * subject (today a referral) for an analyst to review (US-F4, UC-24). It starts
 * `pending` and is resolved once — `approved` (cleared) or `blocked` (confirmed
 * fraud, the subject blocked and any reward reversed). The resolution records who
 * decided and when, feeding the immutable audit trail (BR-19).
 */
export class FraudAlert extends AggregateRoot<FraudAlertProps, FraudAlertId> {
  private constructor(id: FraudAlertId, props: FraudAlertProps) {
    super(id, props);
  }

  /** Raises a new pending alert against a subject. */
  static raise(input: {
    subjectType: string;
    subjectId: string;
    signal: string;
    evidence: string;
  }): Result<FraudAlert, DomainError> {
    const subjectId = input.subjectId.trim();
    if (subjectId.length === 0) {
      return err(new InvalidFraudAlertError("A fraud alert requires a subject."));
    }
    return ok(
      new FraudAlert(FraudAlertId.generate(), {
        subjectType: input.subjectType.trim() || "referral",
        subjectId,
        signal: input.signal.trim() || "manual",
        evidence: input.evidence.trim().slice(0, MAX_EVIDENCE_LENGTH),
        status: "pending",
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      })
    );
  }

  /** Rebuilds an alert from a persisted snapshot, revalidating its status. */
  static restore(input: RestoreFraudAlertInput): Result<FraudAlert, DomainError> {
    if (!isFraudStatus(input.status)) {
      return err(new CorruptFraudAlertSnapshotError(`Unknown fraud status "${input.status}".`));
    }
    return ok(
      new FraudAlert(FraudAlertId.from(input.id), {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        signal: input.signal,
        evidence: input.evidence,
        status: input.status,
        resolvedBy: input.resolvedBy,
        resolvedAt: input.resolvedAt,
        createdAt: input.createdAt,
      })
    );
  }

  /** Resolves a pending alert as cleared (`approve`) or confirmed fraud (`block`). */
  resolve(verdict: "approve" | "block", operatorId: string): Result<FraudAlert, DomainError> {
    if (this.props.status !== "pending") {
      return err(new AlertAlreadyResolvedError());
    }
    return ok(
      new FraudAlert(this._id, {
        ...this.props,
        status: verdict === "block" ? "blocked" : "approved",
        resolvedBy: operatorId,
        resolvedAt: new Date().toISOString(),
      })
    );
  }

  get subjectType(): string {
    return this.props.subjectType;
  }

  get subjectId(): string {
    return this.props.subjectId;
  }

  get signal(): string {
    return this.props.signal;
  }

  get evidence(): string {
    return this.props.evidence;
  }

  get status(): FraudStatus {
    return this.props.status;
  }

  get resolvedBy(): string | null {
    return this.props.resolvedBy;
  }

  get resolvedAt(): string | null {
    return this.props.resolvedAt;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }
}
