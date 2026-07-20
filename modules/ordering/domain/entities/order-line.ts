import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidOrderLineError } from "../errors/ordering-errors";

/** Per-line quantity ceiling — mirrors the cart's own limit. */
export const MAX_LINE_QUANTITY = 99;

/** Props backing an {@link OrderLine} value object. */
type OrderLineProps = {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceCents: number;
  readonly currency: string;
  readonly imageUrl: string;
  readonly quantity: number;
};

/** Input accepted by {@link OrderLine.create}. */
export type CreateOrderLineInput = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl?: string;
  quantity: number;
};

/**
 * OrderLine is an immutable snapshot of one product at order time: id, name,
 * unit price, currency and quantity. Prices are re-resolved from the catalog
 * when the order is placed (never trusted from the client cart) and frozen
 * here, so later catalog changes cannot alter a placed order. The `productId`
 * is a plain correlation string, keeping ordering decoupled from the catalog's
 * `ProductId` type.
 */
export class OrderLine extends ValueObject<OrderLineProps> {
  private constructor(props: OrderLineProps) {
    super(props);
  }

  /** Builds an OrderLine, validating its snapshot and quantity. Fails with a Result. */
  static create(input: CreateOrderLineInput): Result<OrderLine, DomainError> {
    const productId = input.productId.trim();
    if (productId.length === 0) {
      return err(new InvalidOrderLineError("Order line requires a product id."));
    }

    const name = input.name.trim();
    if (name.length === 0) {
      return err(new InvalidOrderLineError("Order line requires a product name."));
    }

    if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
      return err(
        new InvalidOrderLineError("Unit price must be a non-negative integer in cents.")
      );
    }

    const currency = input.currency.trim().toUpperCase();
    if (currency.length !== 3) {
      return err(new InvalidOrderLineError("Currency must be a 3-letter ISO-4217 code."));
    }

    if (
      !Number.isInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > MAX_LINE_QUANTITY
    ) {
      return err(
        new InvalidOrderLineError(
          `Quantity must be an integer between 1 and ${MAX_LINE_QUANTITY}.`
        )
      );
    }

    return ok(
      new OrderLine({
        productId,
        name,
        unitPriceCents: input.unitPriceCents,
        currency,
        imageUrl: input.imageUrl?.trim() ?? "",
        quantity: input.quantity,
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

  get quantity(): number {
    return this.props.quantity;
  }

  /** The line total in minor units: unit price times quantity. */
  get lineTotalCents(): number {
    return this.props.unitPriceCents * this.props.quantity;
  }
}
