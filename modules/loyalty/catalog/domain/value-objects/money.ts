import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidPriceError } from "../errors/catalog-errors";

/** Props backing a {@link Money} value object. */
type MoneyProps = {
  readonly amountCents: number;
  readonly currency: string;
};

/**
 * Money is an immutable value object representing a price as an integer amount
 * of minor units (cents) plus an ISO-4217 currency code. Its factory guarantees
 * a non-negative, integer, finite amount, so an invalid price cannot exist.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  /** Builds Money, validating the amount and currency. Fails with a Result on invalid input. */
  static create(amountCents: number, currency = "USD"): Result<Money, DomainError> {
    if (!Number.isInteger(amountCents)) {
      return err(new InvalidPriceError("Price amount must be an integer number of cents."));
    }
    if (amountCents < 0) {
      return err(new InvalidPriceError("Price amount must not be negative."));
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (normalizedCurrency.length !== 3) {
      return err(new InvalidPriceError("Currency must be a 3-letter ISO-4217 code."));
    }

    return ok(new Money({ amountCents, currency: normalizedCurrency }));
  }

  get amountCents(): number {
    return this.props.amountCents;
  }

  get currency(): string {
    return this.props.currency;
  }
}
