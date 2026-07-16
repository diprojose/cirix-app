import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidQuantityError } from "../errors/cart-errors";

/** Upper bound for a single line's quantity (a made-to-order storefront). */
export const MAX_QUANTITY = 99;

/** Props backing a {@link Quantity} value object. */
type QuantityProps = {
  readonly value: number;
};

/**
 * Quantity is an immutable value object for the amount of a product in a cart
 * line. Its factory guarantees an integer within `[1, MAX_QUANTITY]`, so a cart
 * line can never hold an invalid quantity.
 */
export class Quantity extends ValueObject<QuantityProps> {
  private constructor(props: QuantityProps) {
    super(props);
  }

  /** Builds a Quantity, validating the amount. Fails with a Result on invalid input. */
  static create(value: number): Result<Quantity, DomainError> {
    if (!Number.isInteger(value)) {
      return err(new InvalidQuantityError("Quantity must be an integer."));
    }
    if (value < 1) {
      return err(new InvalidQuantityError("Quantity must be at least 1."));
    }
    if (value > MAX_QUANTITY) {
      return err(
        new InvalidQuantityError(`Quantity must not exceed ${MAX_QUANTITY}.`)
      );
    }
    return ok(new Quantity({ value }));
  }

  get value(): number {
    return this.props.value;
  }

  /**
   * Returns a new Quantity increased by `amount`, clamped to `MAX_QUANTITY`.
   * Fails only when the resulting amount would drop below 1 (negative steps).
   */
  plus(amount: number): Result<Quantity, DomainError> {
    return Quantity.create(Math.min(this.props.value + amount, MAX_QUANTITY));
  }
}
