import { DomainError } from "@/shared/domain/domain-error";

/** Raised when building an {@link Email} with a value that is not a valid address. */
export class InvalidEmailError extends DomainError {
  readonly code = "iam/invalid-email";
}

/** Raised when a user account is built with invalid attributes (e.g. an empty uid). */
export class InvalidUserAccountError extends DomainError {
  readonly code = "iam/invalid-user-account";
}

/** Raised when a session cookie is missing, malformed, expired or revoked. */
export class InvalidSessionError extends DomainError {
  readonly code = "iam/invalid-session";

  constructor(message = "The session is invalid or has expired.") {
    super(message);
  }
}

/** Raised when a session cookie could not be minted from an id token. */
export class SessionCreationError extends DomainError {
  readonly code = "iam/session-creation-failed";

  constructor(message = "Could not create a session from the provided token.") {
    super(message);
  }
}
