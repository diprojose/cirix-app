import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidCustomerError } from "../errors/ordering-errors";

/** Props backing a {@link CustomerInfo} value object. */
type CustomerInfoProps = {
  readonly name: string;
  readonly phone: string;
};

/** Input accepted by {@link CustomerInfo.create}. */
export type CreateCustomerInfoInput = {
  name: string;
  phone: string;
};

/**
 * CustomerInfo identifies who placed an order: a display name plus a Venezuelan
 * phone number normalized to E.164 (`+58` followed by 10 digits). The phone is
 * the business's primary contact channel (calls and WhatsApp), so the factory
 * accepts the formats people actually type — `0412-1234567`, `58 412 1234567`,
 * `+584121234567` — and rejects anything that is not a valid VE number.
 */
export class CustomerInfo extends ValueObject<CustomerInfoProps> {
  private constructor(props: CustomerInfoProps) {
    super(props);
  }

  /** Builds CustomerInfo, validating the name and normalizing the phone. */
  static create(input: CreateCustomerInfoInput): Result<CustomerInfo, DomainError> {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) {
      return err(
        new InvalidCustomerError("Customer name must be between 2 and 80 characters.")
      );
    }

    const phone = normalizeVenezuelanPhone(input.phone);
    if (phone === null) {
      return err(
        new InvalidCustomerError(
          "Phone must be a valid Venezuelan number (e.g. 0412-1234567)."
        )
      );
    }

    return ok(new CustomerInfo({ name, phone }));
  }

  get name(): string {
    return this.props.name;
  }

  /** E.164 phone: `+58` + 10 digits. */
  get phone(): string {
    return this.props.phone;
  }
}

/**
 * Normalizes common Venezuelan phone spellings to `+58XXXXXXXXXX`, or returns
 * `null` when the input is not a plausible VE number (10 national digits
 * starting with 2 — landline — or 4 — mobile).
 */
function normalizeVenezuelanPhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, "");

  let national: string | null = null;
  if (/^\+58\d{10}$/.test(compact)) {
    national = compact.slice(3);
  } else if (/^58\d{10}$/.test(compact)) {
    national = compact.slice(2);
  } else if (/^0\d{10}$/.test(compact)) {
    national = compact.slice(1);
  }

  if (national === null || !/^[24]\d{9}$/.test(national)) {
    return null;
  }
  return `+58${national}`;
}
