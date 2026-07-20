import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IdentityProvider } from "../../domain/ports/identity-provider";
import { UserId } from "../../domain/value-objects/user-id";
import { InvalidUserAccountError } from "../../domain/errors/iam-errors";

/** How long one verified subscription payment keeps premium active. */
export const PREMIUM_PERIOD_DAYS = 30;

/** Input for {@link GrantPremium}: the uid to upgrade, optionally for N days. */
export type GrantPremiumInput = {
  uid: string;
  days?: number;
};

/** Output: when the granted premium now expires (ISO). */
export type GrantPremiumOutput = {
  premiumUntil: string;
};

/**
 * Grants (or renews) the premium subscription for one billing period. Renewal
 * extends from whatever is later — now or the current expiry — so paying early
 * never loses days and paying late starts from today. This is an operator
 * action run after verifying the subscription payment; the user must sign in
 * again for the claim to be baked into a fresh session cookie.
 */
export class GrantPremium implements UseCase<GrantPremiumInput, GrantPremiumOutput> {
  constructor(private readonly identity: IdentityProvider) {}

  async execute(
    input: GrantPremiumInput
  ): Promise<Result<GrantPremiumOutput, DomainError>> {
    const uid = input.uid.trim();
    if (uid.length === 0) {
      return err(new InvalidUserAccountError("User uid must not be empty."));
    }

    const days = input.days ?? PREMIUM_PERIOD_DAYS;
    if (!Number.isInteger(days) || days <= 0) {
      return err(new InvalidUserAccountError("Premium days must be a positive integer."));
    }

    const userId = UserId.from(uid);
    const current = await this.identity.getPremiumExpiry(userId);
    const now = new Date();
    const base = current !== null && current > now ? current : now;
    const until = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await this.identity.grantPremium(userId, until);
    return ok({ premiumUntil: until.toISOString() });
  }
}
