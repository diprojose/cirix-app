import type { Cart } from "../../domain/entities/cart";
import type { RestoreCartInput } from "../../domain/entities/cart";

/** Bumped whenever the persisted shape changes, so old data can be discarded. */
export const CART_SNAPSHOT_VERSION = 1;

/** One persisted cart line: a flat, primitive snapshot of a {@link CartLine}. */
export type CartLineSnapshot = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl: string;
  quantity: number;
};

/**
 * CartSnapshot is the versioned, JSON-serializable persistence shape of a cart —
 * distinct from `CartDto` (the view model) because persistence and presentation
 * evolve independently. The adapter writes this to storage and reads it back
 * through {@link snapshotToRestoreInput} into `Cart.restore`.
 */
export type CartSnapshot = {
  version: number;
  id: string;
  lines: CartLineSnapshot[];
};

/** Serializes a Cart aggregate into its persistence snapshot. */
export const toSnapshot = (cart: Cart): CartSnapshot => ({
  version: CART_SNAPSHOT_VERSION,
  id: cart.id.value,
  lines: cart.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    currency: line.currency,
    imageUrl: line.imageUrl,
    quantity: line.quantity.value,
  })),
});

/** Adapts a stored snapshot into the input expected by `Cart.restore`. */
export const snapshotToRestoreInput = (snapshot: CartSnapshot): RestoreCartInput => ({
  id: snapshot.id,
  lines: snapshot.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    currency: line.currency,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
  })),
});
