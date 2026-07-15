import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { UserId } from "../../domain/value-objects/user-id";
import { InvalidUserAccountError } from "../../domain/errors/iam-errors";

/** Input for {@link GrantPremium}: the uid of the user to upgrade. */
export type GrantPremiumInput = {
  uid: string;
};

/**
 * Grants the premium subscription claim to a user. This is an operator action,
 * run out-of-band once a subscription has been arranged; there is no public
 * flow that reaches it. The user must sign in again afterwards for the claim to
 * be baked into a fresh session cookie.
 */
export class GrantPremium implements UseCase<GrantPremiumInput, void> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(input: GrantPremiumInput): Promise<Result<void, DomainError>> {
    const uid = input.uid.trim();
    if (uid.length === 0) {
      return err(new InvalidUserAccountError("User uid must not be empty."));
    }

    await this.identity.grantPremium(UserId.from(uid));
    return ok(undefined);
  }
}
