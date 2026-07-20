import { Entity } from "@/shared/domain/entity";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PaymentReportId } from "../value-objects/payment-report-id";
import { isPaymentMethod, type PaymentMethod } from "../value-objects/payment-method";
import {
  InvalidPaymentReportError,
  PaymentAlreadyReviewedError,
} from "../errors/ordering-errors";

/** Verification lifecycle of a report: the operator confirms or rejects it. */
export type PaymentReportStatus = "reported" | "verified" | "rejected";

/** Props backing a {@link PaymentReport} entity. */
type PaymentReportProps = {
  method: PaymentMethod;
  reference: string;
  note: string;
  reportedAt: string;
  status: PaymentReportStatus;
};

/** Input accepted by {@link PaymentReport.create}. */
export type CreatePaymentReportInput = {
  method: string;
  reference: string;
  note?: string;
};

/** Input accepted by {@link PaymentReport.restore} when rehydrating persistence. */
export type RestorePaymentReportInput = {
  id: string;
  method: string;
  reference: string;
  note: string;
  reportedAt: string;
  status: string;
};

const MAX_REFERENCE_LENGTH = 40;
const MAX_NOTE_LENGTH = 280;

/**
 * PaymentReport records the customer's claim of having paid: which method they
 * used and the transaction reference the bank gave them (Pago Móvil and
 * transfers always produce one; cash has none). The operator later verifies the
 * reference against the business account and marks the report verified or
 * rejected — the order itself only advances once a report is verified.
 */
export class PaymentReport extends Entity<PaymentReportProps, PaymentReportId> {
  private constructor(id: PaymentReportId, props: PaymentReportProps) {
    super(id, props);
  }

  /** Builds a fresh report in `reported` status, validating method and reference. */
  static create(input: CreatePaymentReportInput): Result<PaymentReport, DomainError> {
    if (!isPaymentMethod(input.method)) {
      return err(new InvalidPaymentReportError(`Unknown payment method "${input.method}".`));
    }

    const reference = input.reference.trim();
    if (input.method !== "efectivo" && reference.length < 4) {
      return err(
        new InvalidPaymentReportError(
          "A payment reference of at least 4 characters is required."
        )
      );
    }
    if (reference.length > MAX_REFERENCE_LENGTH) {
      return err(
        new InvalidPaymentReportError(
          `Payment reference must not exceed ${MAX_REFERENCE_LENGTH} characters.`
        )
      );
    }

    const note = (input.note ?? "").trim();
    if (note.length > MAX_NOTE_LENGTH) {
      return err(
        new InvalidPaymentReportError(`Note must not exceed ${MAX_NOTE_LENGTH} characters.`)
      );
    }

    return ok(
      new PaymentReport(PaymentReportId.generate(), {
        method: input.method,
        reference,
        note,
        reportedAt: new Date().toISOString(),
        status: "reported",
      })
    );
  }

  /** Rebuilds a report from persisted primitives. */
  static restore(input: RestorePaymentReportInput): Result<PaymentReport, DomainError> {
    if (!isPaymentMethod(input.method)) {
      return err(new InvalidPaymentReportError(`Unknown payment method "${input.method}".`));
    }
    if (!isPaymentReportStatus(input.status)) {
      return err(new InvalidPaymentReportError(`Unknown report status "${input.status}".`));
    }

    return ok(
      new PaymentReport(PaymentReportId.from(input.id), {
        method: input.method,
        reference: input.reference,
        note: input.note,
        reportedAt: input.reportedAt,
        status: input.status,
      })
    );
  }

  /**
   * Operator review: marks the report verified (money confirmed in the account)
   * or rejected. Only a pending (`reported`) report can be reviewed; the
   * outcome is final. Returns a **new** report — the entity never mutates.
   */
  review(verdict: "verified" | "rejected"): Result<PaymentReport, DomainError> {
    if (this.props.status !== "reported") {
      return err(new PaymentAlreadyReviewedError(this.props.status));
    }
    return ok(new PaymentReport(this._id, { ...this.props, status: verdict }));
  }

  get method(): PaymentMethod {
    return this.props.method;
  }

  get reference(): string {
    return this.props.reference;
  }

  get note(): string {
    return this.props.note;
  }

  /** ISO timestamp of when the customer reported the payment. */
  get reportedAt(): string {
    return this.props.reportedAt;
  }

  get status(): PaymentReportStatus {
    return this.props.status;
  }
}

/** Type guard for report statuses loaded from persistence. */
function isPaymentReportStatus(value: string): value is PaymentReportStatus {
  return value === "reported" || value === "verified" || value === "rejected";
}
