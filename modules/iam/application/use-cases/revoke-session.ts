import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";

/** Input for {@link RevokeSession}: the session cookie to invalidate. */
export type RevokeSessionInput = {
  sessionCookie: string | null;
};

/**
 * Revokes the current session on logout. It is deliberately forgiving: a
 * missing cookie or a provider that cannot revoke it is not a business failure,
 * because the caller will clear the cookie regardless. Best-effort revocation
 * prevents a stolen cookie from being renewed.
 */
export class RevokeSession implements UseCase<RevokeSessionInput, void> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(input: RevokeSessionInput): Promise<Result<void, DomainError>> {
    if (input.sessionCookie) {
      try {
        await this.identity.revokeSession(input.sessionCookie);
      } catch {
        // Ignore: the cookie is cleared by the caller either way.
      }
    }
    return ok(undefined);
  }
}
