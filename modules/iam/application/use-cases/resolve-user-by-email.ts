import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { Email } from "../../domain/value-objects/email";
import { UserNotFoundError } from "../../domain/errors/iam-errors";

/** Input for {@link ResolveUserByEmail}: the email an operator typed. */
export type ResolveUserByEmailInput = {
  email: string;
};

/** The resolved identity: the uid behind the email. */
export type ResolvedUserDto = {
  uid: string;
  email: string;
};

/**
 * Resolves a registered user's uid from their email. Operator actions (manual
 * balance adjustments, fraud alerts) target people by the email the customer
 * shared, while the identity system keys everything by uid — this use case
 * bridges the two.
 */
export class ResolveUserByEmail
  implements UseCase<ResolveUserByEmailInput, ResolvedUserDto>
{
  constructor(private readonly identity: IdentityProvider) {}

  async execute(
    input: ResolveUserByEmailInput
  ): Promise<Result<ResolvedUserDto, DomainError>> {
    const email = Email.create(input.email);
    if (!email.ok) {
      return email;
    }

    const userId = await this.identity.findUserIdByEmail(email.value.value);
    if (userId === null) {
      return err(new UserNotFoundError(email.value.value));
    }

    return ok({ uid: userId.value, email: email.value.value });
  }
}
