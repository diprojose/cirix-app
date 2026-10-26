import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CustomerId } from "../value-objects/customer-id";
import { InvalidCustomerError } from "../errors/customer-errors";

/** How the customer first reached the business. */
export const CUSTOMER_SOURCES = ["table_qr", "web", "manual", "import"] as const;

export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];

export const isCustomerSource = (value: string): value is CustomerSource =>
  (CUSTOMER_SOURCES as readonly string[]).includes(value);

type CustomerProps = {
  businessId: string;
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  source: CustomerSource;
  tags: readonly string[];
  createdAt: string;
  lastSeenAt: string;
};

/** Input accepted by {@link Customer.create}. */
export type CreateCustomerInput = {
  businessId: string;
  userId: string;
  email: string;
  name: string;
  phone?: string | null;
  source: string;
};

/** Plain shape used to rebuild a Customer from persistence. */
export type CustomerSnapshot = {
  businessId: string;
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  source: string;
  tags: readonly string[];
  createdAt: string;
  lastSeenAt: string;
};

const MIN_NAME = 2;
const MAX_NAME = 100;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

/**
 * Normalizes a phone number: keeps a leading `+` and digits, drops spaces,
 * dashes and brackets. Returns `null` for empty input and `undefined` when the
 * value cannot be a phone number. The number is contact data only: it is not
 * verified and must never be treated as proof of identity.
 */
function normalizePhone(raw: string | null | undefined): string | null | undefined {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return undefined;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) return undefined;
  return `${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * Customer is the CRM record of one person inside one business. It is the
 * shared core every program (points, stamps, reputation, chat) writes to, so a
 * business sees one history per person instead of one per feature.
 */
export class Customer extends AggregateRoot<CustomerProps, CustomerId> {
  private constructor(id: CustomerId, props: CustomerProps) {
    super(id, props);
  }

  static create(input: CreateCustomerInput, now: Date = new Date()): Result<Customer, DomainError> {
    const businessId = input.businessId.trim();
    const userId = input.userId.trim();
    if (!businessId || !userId) {
      return err(new InvalidCustomerError("Business and user are required."));
    }
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name.length < MIN_NAME || name.length > MAX_NAME) {
      return err(new InvalidCustomerError(`Name must be ${MIN_NAME}-${MAX_NAME} characters.`));
    }
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@") || email.length > 254) {
      return err(new InvalidCustomerError("A valid email is required."));
    }
    const phone = normalizePhone(input.phone);
    if (phone === undefined) {
      return err(new InvalidCustomerError("Phone must have 7 to 15 digits."));
    }
    if (!isCustomerSource(input.source)) {
      return err(new InvalidCustomerError(`Unknown source "${input.source}".`));
    }
    const stamp = now.toISOString();
    return ok(
      new Customer(CustomerId.of(businessId, userId), {
        businessId,
        userId,
        email,
        name,
        phone,
        source: input.source,
        tags: [],
        createdAt: stamp,
        lastSeenAt: stamp,
      })
    );
  }

  /** Rebuilds a customer from a stored snapshot, keeping its original dates. */
  static restore(snapshot: CustomerSnapshot): Result<Customer, DomainError> {
    const created = Customer.create({ ...snapshot });
    if (!created.ok) return created;
    return ok(
      new Customer(created.value.id, {
        ...created.value.props,
        tags: [...snapshot.tags],
        createdAt: snapshot.createdAt,
        lastSeenAt: snapshot.lastSeenAt,
      })
    );
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

  get name(): string {
    return this.props.name;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get source(): CustomerSource {
    return this.props.source;
  }

  get tags(): readonly string[] {
    return this.props.tags;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get lastSeenAt(): string {
    return this.props.lastSeenAt;
  }
}
