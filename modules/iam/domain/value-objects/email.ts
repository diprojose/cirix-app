import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidEmailError } from "../errors/iam-errors";

/** Props backing an {@link Email} value object. */
type EmailProps = {
  value: string;
};

// Pragmatic address shape: a non-empty local part, an "@", and a dotted domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email is an immutable value object wrapping a validated email address.
 * Construction goes through {@link Email.create}, which normalises the value
 * (trim + lowercase) and rejects anything that is not a well-formed address,
 * so an invalid Email can never exist in the domain.
 */
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  /** Builds an Email, validating and normalising the input. */
  static create(value: string): Result<Email, DomainError> {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      return err(new InvalidEmailError(`"${value}" is not a valid email address.`));
    }
    return ok(new Email({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
