import type { Cart } from "../../domain/entities/cart";
import type { CartLine } from "../../domain/entities/cart-line";

/**
 * CartLineDto is the plain, serializable view of a {@link CartLine}. Prices stay
 * as integer minor units plus a currency code so the UI edge can format them with
 * `formatPrice`; `lineTotalCents` is precomputed so the client never re-derives it.
 */
export type CartLineDto = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl: string;
  quantity: number;
  lineTotalCents: number;
};

/**
 * CartDto is the plain, serializable view of a {@link Cart} exposed by use cases.
 * Being a plain object (no class instances, no value objects), it can safely cross
 * the RSC server→client boundary and be held directly in client React state.
 */
export type CartDto = {
  id: string;
  lines: CartLineDto[];
  subtotalCents: number;
  currency: string | null;
  totalQuantity: number;
  isEmpty: boolean;
};

/** Maps a CartLine value object to its serializable DTO. */
const toCartLineDto = (line: CartLine): CartLineDto => ({
  productId: line.productId,
  name: line.name,
  unitPriceCents: line.unitPriceCents,
  currency: line.currency,
  imageUrl: line.imageUrl,
  quantity: line.quantity.value,
  lineTotalCents: line.lineTotalCents,
});

/** Maps a Cart aggregate to its serializable DTO. */
export const toCartDto = (cart: Cart): CartDto => ({
  id: cart.id.value,
  lines: cart.lines.map(toCartLineDto),
  subtotalCents: cart.subtotalCents,
  currency: cart.currency,
  totalQuantity: cart.totalQuantity,
  isEmpty: cart.isEmpty,
});
