import type { CartRepository } from "../../domain/repositories/cart-repository";
import { LocalStorageCartRepository } from "../persistence/local-storage-cart-repository";
import { GetCart } from "../../application/use-cases/get-cart";
import { AddItemToCart } from "../../application/use-cases/add-item-to-cart";
import { ChangeItemQuantity } from "../../application/use-cases/change-item-quantity";
import { RemoveItemFromCart } from "../../application/use-cases/remove-item-from-cart";
import { ClearCart } from "../../application/use-cases/clear-cart";

/*
 * Composition root for the cart module. This is the single place that names the
 * concrete adapter: it instantiates the localStorage-backed repository and injects
 * it into the use cases through their constructors. Because the adapter touches
 * `localStorage`, this container is imported only from client code (the cart
 * provider) — never from a Server Component. Swapping persistence (e.g. to a
 * server-backed cart) means changing only this file.
 */

// One repository instance per browser runtime; it reads/writes localStorage lazily.
const cartRepository: CartRepository = new LocalStorageCartRepository();

/** Builds the "get cart" use case with its dependencies wired. */
export const makeGetCart = (): GetCart => new GetCart(cartRepository);

/** Builds the "add item to cart" use case with its dependencies wired. */
export const makeAddItemToCart = (): AddItemToCart =>
  new AddItemToCart(cartRepository);

/** Builds the "change item quantity" use case with its dependencies wired. */
export const makeChangeItemQuantity = (): ChangeItemQuantity =>
  new ChangeItemQuantity(cartRepository);

/** Builds the "remove item from cart" use case with its dependencies wired. */
export const makeRemoveItemFromCart = (): RemoveItemFromCart =>
  new RemoveItemFromCart(cartRepository);

/** Builds the "clear cart" use case with its dependencies wired. */
export const makeClearCart = (): ClearCart => new ClearCart(cartRepository);
