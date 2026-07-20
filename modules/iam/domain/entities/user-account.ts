import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { UserId } from "../value-objects/user-id";
import { Email } from "../value-objects/email";
import { AccessTier } from "../value-objects/access-tier";
import { InvalidUserAccountError } from "../errors/iam-errors";

/** Props backing a {@link UserAccount} aggregate. */
type UserAccountProps = {
  email: Email;
  tier: AccessTier;
  premiumUntil: string | null;
};

/** Input accepted by {@link UserAccount.create}. */
export type CreateUserAccountInput = {
  uid: string;
  email: string;
  premium?: boolean;
  /** ISO timestamp of when the premium subscription expires, if known. */
  premiumUntil?: string | null;
  operator?: boolean;
};

/**
 * UserAccount is the identity aggregate root: an authenticated principal known
 * to the app, identified by its {@link UserId} (the Firebase uid). It owns the
 * mapping from authentication state to an {@link AccessTier}, exposing the
 * authorization questions the rest of the system asks — whether the user may
 * place orders or view recipes — without leaking how tiers are represented.
 */
export class UserAccount extends AggregateRoot<UserAccountProps, UserId> {
  private constructor(id: UserId, props: UserAccountProps) {
    super(id, props);
  }

  /**
   * Builds a UserAccount from decoded authentication data, validating its
   * invariants. A signed-in user is a `customer` by default, `premium` when the
   * subscription claim is present, and `operator` (the most capable tier) when
   * flagged as store staff.
   */
  static create(input: CreateUserAccountInput): Result<UserAccount, DomainError> {
    const uid = input.uid.trim();
    if (uid.length === 0) {
      return err(new InvalidUserAccountError("User uid must not be empty."));
    }

    const emailResult = Email.create(input.email);
    if (!emailResult.ok) {
      return emailResult;
    }

    const tier = input.operator
      ? AccessTier.operator()
      : input.premium
        ? AccessTier.premium()
        : AccessTier.customer();
    const account = new UserAccount(UserId.from(uid), {
      email: emailResult.value,
      tier,
      premiumUntil: input.premiumUntil ?? null,
    });
    return ok(account);
  }

  get email(): Email {
    return this.props.email;
  }

  get tier(): AccessTier {
    return this.props.tier;
  }

  /** ISO timestamp of when premium expires, or `null` when unknown/absent. */
  get premiumUntil(): string | null {
    return this.props.premiumUntil;
  }

  /** Whether this user may place made-to-order purchases. */
  canPlaceOrders(): boolean {
    return this.props.tier.canPlaceOrders();
  }

  /** Whether this user may access the subscriber recipe content. */
  canViewRecipes(): boolean {
    return this.props.tier.canViewRecipes();
  }

  /** Whether this user may run the store's admin panel. */
  canOperateStore(): boolean {
    return this.props.tier.canOperateStore();
  }
}
