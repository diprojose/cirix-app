import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a notification is built with invalid attributes. */
export class InvalidNotificationError extends DomainError {
  readonly code = "notifications/invalid-notification";
}

/** Raised when a persisted notification fails domain validation on restore. */
export class CorruptNotificationSnapshotError extends DomainError {
  readonly code = "notifications/corrupt-snapshot";
}
