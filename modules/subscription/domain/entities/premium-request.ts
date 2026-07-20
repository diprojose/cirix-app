import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PremiumRequestId } from "../value-objects/premium-request-id";
import { InvalidPremiumRequestError } from "../errors/subscription-errors";

/** Lifecycle of a premium upgrade request. An operator moves it forward. */
export type PremiumRequestStatus = "pending" | "contacted" | "granted";

/**
 * Payment methods a subscription can be paid with. Cash is absent on purpose:
 * subscriptions are settled remotely, never against a delivery.
 */
export const SUBSCRIPTION_PAYMENT_METHODS = [
  "pago_movil",
  "transferencia",
  "zelle",
] as const;

export type SubscriptionPaymentMethod = (typeof SUBSCRIPTION_PAYMENT_METHODS)[number];

/** The customer's claim of having paid the subscription: method + bank reference. */
export type PremiumRequestPayment = {
  readonly method: SubscriptionPaymentMethod;
  readonly reference: string;
};

/** Props backing a {@link PremiumRequest} aggregate. */
type PremiumRequestProps = {
  uid: string;
  email: string;
  requestedAt: Date;
  status: PremiumRequestStatus;
  payment: PremiumRequestPayment | null;
};

/** Input accepted by {@link PremiumRequest.create}. */
export type CreatePremiumRequestInput = {
  id?: string;
  uid: string;
  email: string;
  requestedAt?: Date;
  status?: PremiumRequestStatus;
  payment?: { method: string; reference: string } | null;
};

/**
 * PremiumRequest is the subscription aggregate root: a signed-in user's
 * expression of interest in the premium plan. The app never grants premium on
 * its own — it records this request so an operator can contact the user and
 * grant the claim out-of-band. It owns the invariant that a request always
 * carries the uid and contact email of a real, signed-in user.
 */
export class PremiumRequest extends AggregateRoot<
  PremiumRequestProps,
  PremiumRequestId
> {
  private constructor(id: PremiumRequestId, props: PremiumRequestProps) {
    super(id, props);
  }

  /** Builds a PremiumRequest, validating its invariants. */
  static create(
    input: CreatePremiumRequestInput
  ): Result<PremiumRequest, DomainError> {
    const uid = input.uid.trim();
    if (uid.length === 0) {
      return err(new InvalidPremiumRequestError("Request uid must not be empty."));
    }

    const email = input.email.trim();
    if (email.length === 0) {
      return err(
        new InvalidPremiumRequestError("Request email must not be empty.")
      );
    }

    let payment: PremiumRequestPayment | null = null;
    if (input.payment) {
      const validated = validatePayment(input.payment);
      if (!validated.ok) {
        return validated;
      }
      payment = validated.value;
    }

    const id = input.id
      ? PremiumRequestId.from(input.id)
      : PremiumRequestId.generate();
    const request = new PremiumRequest(id, {
      uid,
      email,
      requestedAt: input.requestedAt ?? new Date(),
      status: input.status ?? "pending",
      payment,
    });
    return ok(request);
  }

  /**
   * Attaches (or replaces) the customer's payment claim on a request, so a
   * user who requested first and paid later reports the reference on the same
   * pending request. Returns a **new** request — the aggregate never mutates.
   */
  withPayment(input: {
    method: string;
    reference: string;
  }): Result<PremiumRequest, DomainError> {
    const validated = validatePayment(input);
    if (!validated.ok) {
      return validated;
    }
    return ok(new PremiumRequest(this._id, { ...this.props, payment: validated.value }));
  }

  /**
   * Marks the request granted once the operator has activated the premium
   * claim. Returns a **new** request — the aggregate never mutates in place.
   */
  markGranted(): PremiumRequest {
    return new PremiumRequest(this._id, { ...this.props, status: "granted" });
  }

  get uid(): string {
    return this.props.uid;
  }

  get email(): string {
    return this.props.email;
  }

  get requestedAt(): Date {
    return this.props.requestedAt;
  }

  get status(): PremiumRequestStatus {
    return this.props.status;
  }

  get payment(): PremiumRequestPayment | null {
    return this.props.payment;
  }
}

/** Validates a raw payment claim into a {@link PremiumRequestPayment}. */
function validatePayment(input: {
  method: string;
  reference: string;
}): Result<PremiumRequestPayment, DomainError> {
  const method = input.method.trim() as SubscriptionPaymentMethod;
  if (!(SUBSCRIPTION_PAYMENT_METHODS as readonly string[]).includes(method)) {
    return err(
      new InvalidPremiumRequestError(`Unknown subscription payment method "${input.method}".`)
    );
  }

  const reference = input.reference.trim();
  if (reference.length < 4 || reference.length > 40) {
    return err(
      new InvalidPremiumRequestError(
        "Payment reference must be between 4 and 40 characters."
      )
    );
  }

  return ok({ method, reference });
}
