import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type {
  IdentityProvider,
  MintedSession,
} from "../../domain/ports/identity-provider";
import { PlatformAccessDeniedError, SessionCreationError } from "../../domain/errors/iam-errors";

/** Input for {@link CreateSession}: a fresh Firebase id token from the client. */
export type CreateSessionInput = {
  idToken: string;
};

// Firebase session cookies may live up to 14 days; we use the full window.
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Exchanges a client id token for a server session cookie. Called by the login
 * route handler after the browser has signed in with the provider. Returns the
 * minted cookie and its expiry so the adapter can set it; fails with a
 * {@link SessionCreationError} when the token is missing or rejected.
 */
export class CreateSession implements UseCase<CreateSessionInput, MintedSession> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(
    input: CreateSessionInput
  ): Promise<Result<MintedSession, DomainError>> {
    if (!input.idToken) {
      return err(new SessionCreationError("Missing id token."));
    }

    try {
      const session = await this.identity.createSession(
        input.idToken,
        SESSION_DURATION_MS
      );
      return ok(session);
    } catch (error) {
      if (error instanceof PlatformAccessDeniedError) return err(error);
      return err(new SessionCreationError());
    }
  }
}
