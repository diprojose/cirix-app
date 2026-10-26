import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { isMemberRole, type MemberRole } from "../value-objects/member-role";
import { InvalidMembershipError } from "../errors/tenancy-errors";

type MembershipProps = {
  businessId: string;
  userId: string;
  email: string;
  role: MemberRole;
  createdAt: string;
};

/** Input accepted by {@link Membership.create}. */
export type CreateMembershipInput = {
  businessId: string;
  userId: string;
  email: string;
  role: string;
};

/**
 * Membership links one person to one business with a role. It is the only way
 * to gain staff or owner powers: platform admission never implies it. The pair
 * (businessId, userId) is unique, so granting a role again replaces the old one.
 */
export class Membership extends ValueObject<MembershipProps> {
  private constructor(props: MembershipProps) {
    super(props);
  }

  static create(input: CreateMembershipInput, now: Date = new Date()): Result<Membership, DomainError> {
    const businessId = input.businessId.trim();
    const userId = input.userId.trim();
    const email = input.email.trim().toLowerCase();
    if (!businessId || !userId) {
      return err(new InvalidMembershipError("Business and user are required."));
    }
    if (!email.includes("@") || email.length > 254) {
      return err(new InvalidMembershipError("A valid email is required."));
    }
    if (!isMemberRole(input.role)) {
      return err(new InvalidMembershipError(`Unknown role "${input.role}".`));
    }
    return ok(new Membership({ businessId, userId, email, role: input.role, createdAt: now.toISOString() }));
  }

  /** Rebuilds a membership from stored data without re-stamping its date. */
  static restore(snapshot: CreateMembershipInput & { createdAt: string }): Result<Membership, DomainError> {
    const created = Membership.create(snapshot);
    return created.ok ? ok(new Membership({ ...created.value.props, createdAt: snapshot.createdAt })) : created;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): MemberRole {
    return this.props.role;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }
}
