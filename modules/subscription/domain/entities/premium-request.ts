import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PremiumRequestId } from "../value-objects/premium-request-id";
import { InvalidPremiumRequestError } from "../errors/subscription-errors";

/** Lifecycle of a premium upgrade request. An operator moves it forward. */
export type PremiumRequestStatus = "pending" | "contacted" | "granted";

/** Props backing a {@link PremiumRequest} aggregate. */
type PremiumRequestProps = {
  uid: string;
  email: string;
  requestedAt: Date;
  status: PremiumRequestStatus;
};

/** Input accepted by {@link PremiumRequest.create}. */
export type CreatePremiumRequestInput = {
  id?: string;
  uid: string;
  email: string;
  requestedAt?: Date;
  status?: PremiumRequestStatus;
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

    const id = input.id
      ? PremiumRequestId.from(input.id)
      : PremiumRequestId.generate();
    const request = new PremiumRequest(id, {
      uid,
      email,
      requestedAt: input.requestedAt ?? new Date(),
      status: input.status ?? "pending",
    });
    return ok(request);
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
}
