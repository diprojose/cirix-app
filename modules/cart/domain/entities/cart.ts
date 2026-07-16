import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CartId } from "../value-objects/cart-id";
import { Quantity } from "../value-objects/quantity";
import { CartLine, type CreateCartLineInput } from "./cart-line";
import { CartLineNotFoundError, MixedCurrencyError } from "../errors/cart-errors";

/** Props backing a {@link Cart} aggregate. */
type CartProps = {
  lines: CartLine[];
};

/** Input accepted by {@link Cart.restore} when rehydrating a persisted cart. */
export type RestoreCartInput = {
  id: string;
  lines: CreateCartLineInput[];
};

/**
 * Cart is the aggregate root of the cart context: a guest's basket of made-to-order
 * products. It owns its invariants — every line holds a valid {@link Quantity},
 * and the whole cart carries a single currency so its subtotal is well defined —
 * and never mutates in place: each command returns a **new** Cart, which keeps the
 * client's React state updates predictable and lets the aggregate stay the single
 * source of truth for cart rules (out of the UI).
 */
export class Cart extends AggregateRoot<CartProps, CartId> {
  private constructor(id: CartId, props: CartProps) {
    super(id, props);
  }

  /** Builds a fresh, empty cart with a new identity. */
  static create(): Cart {
    return new Cart(CartId.generate(), { lines: [] });
  }

  /**
   * Rebuilds a cart from a persisted snapshot, revalidating every line and the
   * single-currency invariant. Fails with a Result so a corrupt snapshot can be
   * discarded by the adapter rather than crashing the app.
   */
  static restore(input: RestoreCartInput): Result<Cart, DomainError> {
    const lines: CartLine[] = [];
    for (const lineInput of input.lines) {
      const lineResult = CartLine.create(lineInput);
      if (!lineResult.ok) {
        return lineResult;
      }
      const line = lineResult.value;
      const currency = lines[0]?.currency;
      if (currency !== undefined && currency !== line.currency) {
        return err(new MixedCurrencyError(currency, line.currency));
      }
      lines.push(line);
    }
    return ok(new Cart(CartId.from(input.id), { lines }));
  }

  /**
   * Adds a product to the cart. If a line for the same product already exists its
   * quantity is increased (capped at the per-line maximum); otherwise a new line
   * is appended. Rejects a product whose currency differs from the cart's.
   */
  addProduct(input: CreateCartLineInput): Result<Cart, DomainError> {
    const lineResult = CartLine.create(input);
    if (!lineResult.ok) {
      return lineResult;
    }
    const incoming = lineResult.value;

    const currency = this.currency;
    if (currency !== null && currency !== incoming.currency) {
      return err(new MixedCurrencyError(currency, incoming.currency));
    }

    const existing = this.props.lines.find(
      (line) => line.productId === incoming.productId
    );

    let nextLines: CartLine[];
    if (existing) {
      const mergedQuantity = existing.quantity.plus(incoming.quantity.value);
      if (!mergedQuantity.ok) {
        return mergedQuantity;
      }
      nextLines = this.props.lines.map((line) =>
        line.productId === incoming.productId
          ? line.withQuantity(mergedQuantity.value)
          : line
      );
    } else {
      nextLines = [...this.props.lines, incoming];
    }

    return ok(new Cart(this._id, { lines: nextLines }));
  }

  /** Sets an existing line's quantity. Fails if the product is not in the cart. */
  changeQuantity(productId: string, quantity: number): Result<Cart, DomainError> {
    const target = this.props.lines.find((line) => line.productId === productId);
    if (target === undefined) {
      return err(new CartLineNotFoundError(productId));
    }

    const quantityResult = Quantity.create(quantity);
    if (!quantityResult.ok) {
      return quantityResult;
    }

    const nextLines = this.props.lines.map((line) =>
      line.productId === productId ? line.withQuantity(quantityResult.value) : line
    );
    return ok(new Cart(this._id, { lines: nextLines }));
  }

  /** Removes a line from the cart. Fails if the product is not in the cart. */
  removeProduct(productId: string): Result<Cart, DomainError> {
    const exists = this.props.lines.some((line) => line.productId === productId);
    if (!exists) {
      return err(new CartLineNotFoundError(productId));
    }
    const nextLines = this.props.lines.filter(
      (line) => line.productId !== productId
    );
    return ok(new Cart(this._id, { lines: nextLines }));
  }

  /** Returns an empty cart keeping the same identity. */
  clear(): Cart {
    return new Cart(this._id, { lines: [] });
  }

  /** The cart lines (a defensive copy — the aggregate stays immutable). */
  get lines(): readonly CartLine[] {
    return [...this.props.lines];
  }

  /** Sum of every line total, in minor units. */
  get subtotalCents(): number {
    return this.props.lines.reduce((total, line) => total + line.lineTotalCents, 0);
  }

  /** The single currency of the cart, or `null` when empty. */
  get currency(): string | null {
    return this.props.lines[0]?.currency ?? null;
  }

  /** Total number of items across all lines. */
  get totalQuantity(): number {
    return this.props.lines.reduce((total, line) => total + line.quantity.value, 0);
  }

  get isEmpty(): boolean {
    return this.props.lines.length === 0;
  }
}
