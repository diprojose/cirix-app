import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { BusinessId } from "../value-objects/business-id";
import { BusinessSlug } from "../value-objects/business-slug";
import {
  isBusinessKind,
  isBusinessStatus,
  type BusinessKind,
  type BusinessStatus,
} from "../value-objects/business-kind";
import { InvalidBusinessError } from "../errors/tenancy-errors";

type BusinessProps = {
  slug: BusinessSlug;
  name: string;
  kind: BusinessKind;
  status: BusinessStatus;
  createdAt: string;
};

/** Input accepted by {@link Business.create}. */
export type CreateBusinessInput = {
  name: string;
  slug: string;
  kind: string;
};

/** Plain shape used to rebuild a Business from persistence. */
export type BusinessSnapshot = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  createdAt: string;
};

const MIN_NAME = 2;
const MAX_NAME = 100;

/**
 * Business is the tenant of the platform: one supermarket, restaurant or other
 * client of Cirix. Everything a business owns (customers, visits, points) hangs
 * off its id, and people reach it through memberships.
 */
export class Business extends AggregateRoot<BusinessProps, BusinessId> {
  private constructor(id: BusinessId, props: BusinessProps) {
    super(id, props);
  }

  /** Builds a brand-new, active business, validating every attribute. */
  static create(input: CreateBusinessInput, now: Date = new Date()): Result<Business, DomainError> {
    const name = input.name.trim();
    if (name.length < MIN_NAME || name.length > MAX_NAME) {
      return err(new InvalidBusinessError(`Name must be ${MIN_NAME}-${MAX_NAME} characters.`));
    }
    const slug = BusinessSlug.create(input.slug);
    if (!slug.ok) return slug;
    if (!isBusinessKind(input.kind)) {
      return err(new InvalidBusinessError(`Unknown business kind "${input.kind}".`));
    }
    return ok(
      new Business(BusinessId.generate(), {
        slug: slug.value,
        name,
        kind: input.kind,
        status: "active",
        createdAt: now.toISOString(),
      })
    );
  }

  /** Rebuilds a business from a stored snapshot, failing on corrupt data. */
  static restore(snapshot: BusinessSnapshot): Result<Business, DomainError> {
    const slug = BusinessSlug.create(snapshot.slug);
    if (!slug.ok) return slug;
    if (!isBusinessKind(snapshot.kind) || !isBusinessStatus(snapshot.status) || !snapshot.name) {
      return err(new InvalidBusinessError("Stored business is invalid."));
    }
    return ok(
      new Business(BusinessId.from(snapshot.id), {
        slug: slug.value,
        name: snapshot.name,
        kind: snapshot.kind,
        status: snapshot.status,
        createdAt: snapshot.createdAt,
      })
    );
  }

  get slug(): BusinessSlug {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get kind(): BusinessKind {
    return this.props.kind;
  }

  get status(): BusinessStatus {
    return this.props.status;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get isActive(): boolean {
    return this.props.status === "active";
  }
}
