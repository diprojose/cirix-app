import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidCustomerEventError } from "../errors/customer-errors";

/**
 * What happened to a customer. Each phase adds the types it needs (stamps,
 * points, receipts, surveys); the timeline is the single history a business
 * reads for a person.
 */
export const CUSTOMER_EVENT_TYPES = ["registered", "note"] as const;

export type CustomerEventType = (typeof CUSTOMER_EVENT_TYPES)[number];

export const isCustomerEventType = (value: string): value is CustomerEventType =>
  (CUSTOMER_EVENT_TYPES as readonly string[]).includes(value);

/** Small, flat details. No nested data, no secrets, no free-form personal text. */
export type CustomerEventData = Record<string, string | number | boolean | null>;

type CustomerEventProps = {
  id: string;
  businessId: string;
  userId: string;
  type: CustomerEventType;
  occurredAt: string;
  data: CustomerEventData;
};

export type CreateCustomerEventInput = {
  /** Provide a stable id to make the event idempotent; omit for a random one. */
  id?: string;
  businessId: string;
  userId: string;
  type: string;
  data?: CustomerEventData;
};

const MAX_KEYS = 20;
const MAX_KEY_LENGTH = 40;
const MAX_STRING_LENGTH = 200;

function validData(data: CustomerEventData): boolean {
  const entries = Object.entries(data);
  if (entries.length > MAX_KEYS) return false;
  return entries.every(
    ([key, value]) =>
      key.length > 0 &&
      key.length <= MAX_KEY_LENGTH &&
      (value === null ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        (typeof value === "string" && value.length <= MAX_STRING_LENGTH))
  );
}

/**
 * CustomerEvent is one immutable entry in a customer's timeline. Events are
 * only ever appended: a correction is a new event, never an edit. A stable id
 * makes an event idempotent, so retries cannot record the same thing twice.
 */
export class CustomerEvent extends ValueObject<CustomerEventProps> {
  private constructor(props: CustomerEventProps) {
    super(props);
  }

  static create(input: CreateCustomerEventInput, now: Date = new Date()): Result<CustomerEvent, DomainError> {
    if (!input.businessId.trim() || !input.userId.trim()) {
      return err(new InvalidCustomerEventError("Business and user are required."));
    }
    if (!isCustomerEventType(input.type)) {
      return err(new InvalidCustomerEventError(`Unknown event type "${input.type}".`));
    }
    const data = input.data ?? {};
    if (!validData(data)) {
      return err(new InvalidCustomerEventError("Event data must be small and flat."));
    }
    return ok(
      new CustomerEvent({
        id: input.id ?? crypto.randomUUID(),
        businessId: input.businessId.trim(),
        userId: input.userId.trim(),
        type: input.type,
        occurredAt: now.toISOString(),
        data: { ...data },
      })
    );
  }

  /** Rebuilds an event from storage, keeping its original date and id. */
  static restore(snapshot: CreateCustomerEventInput & { id: string; occurredAt: string }): Result<CustomerEvent, DomainError> {
    const created = CustomerEvent.create(snapshot);
    if (!created.ok) return created;
    return ok(new CustomerEvent({ ...created.value.props, occurredAt: snapshot.occurredAt }));
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): CustomerEventType {
    return this.props.type;
  }

  get occurredAt(): string {
    return this.props.occurredAt;
  }

  get data(): CustomerEventData {
    return this.props.data;
  }
}
