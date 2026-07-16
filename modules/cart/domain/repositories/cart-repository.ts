import type { Cart } from "../entities/cart";

/**
 * CartRepository is the persistence port for the cart aggregate. The domain
 * declares this contract; an infrastructure adapter implements it. The reference
 * adapter persists a guest cart in the browser's `localStorage`, but because use
 * cases depend on this interface — never on a concrete store — a server-backed
 * adapter can replace it later without touching the domain or application layers.
 */
export interface CartRepository {
  /** Returns the stored cart, or a fresh empty cart when none exists. */
  load(): Promise<Cart>;

  /** Persists the cart, replacing any previously stored one. */
  save(cart: Cart): Promise<void>;

  /** Discards the stored cart. */
  clear(): Promise<void>;
}
