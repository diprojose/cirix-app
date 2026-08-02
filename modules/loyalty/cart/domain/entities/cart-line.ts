import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { Quantity } from "../value-objects/quantity";
import { InvalidCartLineError } from "../errors/cart-errors";

/** Props backing a {@link CartLine} value object. */
type CartLineProps = {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceCents: number;
  readonly currency: string;
  readonly imageUrl: string;
  readonly quantity: Quantity;
};

/** Input accepted by {@link CartLine.create}. */
export type CreateCartLineInput = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl?: string;
  quantity: number;
};

/**
 * CartLine is an immutable value object: a snapshot of one product in the cart at
 * add-time (its id, name, unit price, currency and image) together with the
 * chosen {@link Quantity}. It snapshots the price rather than referencing the
 * live {@link Product} so a later price change does not silently alter a cart.
 * The `productId` is a plain correlation string, keeping the cart context
 * decoupled from the catalog's `ProductId` type.
 */
export class CartLine extends ValueObject<CartLineProps> {
  private constructor(props: CartLineProps) {
    super(props);
  }

  /** Builds a CartLine, validating its snapshot and quantity. Fails with a Result. */
  static create(input: CreateCartLineInput): Result<CartLine, DomainError> {
    const productId = input.productId.trim();
    if (productId.length === 0) {
      return err(new InvalidCartLineError("Cart line requires a product id."));
    }

    const name = input.name.trim();
    if (name.length === 0) {
      return err(new InvalidCartLineError("Cart line requires a product name."));
    }

    if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
      return err(
        new InvalidCartLineError("Unit price must be a non-negative integer in cents.")
      );
    }

    const currency = input.currency.trim().toUpperCase();
    if (currency.length !== 3) {
      return err(
        new InvalidCartLineError("Currency must be a 3-letter ISO-4217 code.")
      );
    }

    const quantityResult = Quantity.create(input.quantity);
    if (!quantityResult.ok) {
      return quantityResult;
    }

    return ok(
      new CartLine({
        productId,
        name,
        unitPriceCents: input.unitPriceCents,
        currency,
        imageUrl: input.imageUrl?.trim() ?? "",
        quantity: quantityResult.value,
      })
    );
  }

  get productId(): string {
    return this.props.productId;
  }

  get name(): string {
    return this.props.name;
  }

  get unitPriceCents(): number {
    return this.props.unitPriceCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get quantity(): Quantity {
    return this.props.quantity;
  }

  /** The line total in minor units: unit price times quantity. */
  get lineTotalCents(): number {
    return this.props.unitPriceCents * this.props.quantity.value;
  }

  /** Returns a copy of this line with a different quantity. */
  withQuantity(quantity: Quantity): CartLine {
    return new CartLine({ ...this.props, quantity });
  }
}
