import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { UserId } from "../../domain/value-objects/user-id";
import { InvalidUserAccountError } from "../../domain/errors/iam-errors";

/** Input for {@link RevokePremium}: the uid of the user to downgrade. */
export type RevokePremiumInput = {
  uid: string;
};

/**
 * Removes the premium subscription claim from a user (operator action, e.g. when
 * a subscription lapses). As with granting, the change takes effect on the
 * user's next sign-in when a new session cookie is minted.
 */
export class RevokePremium implements UseCase<RevokePremiumInput, void> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(input: RevokePremiumInput): Promise<Result<void, DomainError>> {
    const uid = input.uid.trim();
    if (uid.length === 0) {
      return err(new InvalidUserAccountError("User uid must not be empty."));
    }

    await this.identity.revokePremium(UserId.from(uid));
    return ok(undefined);
  }
}
