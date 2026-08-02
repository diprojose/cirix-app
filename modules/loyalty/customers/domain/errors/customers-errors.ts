import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a persisted customer profile fails domain validation on restore. */
export class CorruptCustomerProfileSnapshotError extends DomainError {
  readonly code = "customers/corrupt-snapshot";
}
