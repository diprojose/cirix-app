"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartDto } from "@/modules/loyalty/cart/application/dtos/cart-dto";
import type { AddItemToCartInput } from "@/modules/loyalty/cart/application/use-cases/add-item-to-cart";
import {
  makeAddItemToCart,
  makeChangeItemQuantity,
  makeClearCart,
  makeGetCart,
  makeRemoveItemFromCart,
} from "@/modules/loyalty/cart/infrastructure/di/cart-container";

/** What the cart context exposes to any client component under the provider. */
type CartContextValue = {
  /** The current cart, or `null` until it has been loaded from storage. */
  cart: CartDto | null;
  /** True once the initial load from storage has settled (guards SSR/hydration). */
  ready: boolean;
  /** Total item count across all lines (0 before load) — handy for badges. */
  totalQuantity: number;
  /** Adds/increments a product; resolves `true` on success, `false` on a domain error. */
  addItem: (input: AddItemToCartInput) => Promise<boolean>;
  /** Sets a line's quantity; resolves `true` on success. */
  changeQuantity: (productId: string, quantity: number) => Promise<boolean>;
  /** Removes a line; resolves `true` on success. */
  removeItem: (productId: string) => Promise<boolean>;
  /** Empties the cart. */
  clear: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * CartProvider is the client-side driving adapter for the cart context: the
 * analogue of a Server Component page, but on the client. It holds the current
 * {@link CartDto} in React state for rendering and delegates every mutation to the
 * cart use cases, which own persistence (localStorage today). The cart is loaded
 * after mount so the server-rendered markup and the first client render match,
 * avoiding hydration mismatches. It is the app's single global provider.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    makeGetCart()
      .execute()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setCart(result.value);
        }
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const addItem = useCallback(async (input: AddItemToCartInput) => {
    const result = await makeAddItemToCart().execute(input);
    if (result.ok) {
      setCart(result.value);
      return true;
    }
    return false;
  }, []);

  const changeQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const result = await makeChangeItemQuantity().execute({ productId, quantity });
      if (result.ok) {
        setCart(result.value);
        return true;
      }
      return false;
    },
    []
  );

  const removeItem = useCallback(async (productId: string) => {
    const result = await makeRemoveItemFromCart().execute({ productId });
    if (result.ok) {
      setCart(result.value);
      return true;
    }
    return false;
  }, []);

  const clear = useCallback(async () => {
    const result = await makeClearCart().execute();
    if (result.ok) {
      setCart(result.value);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      totalQuantity: cart?.totalQuantity ?? 0,
      addItem,
      changeQuantity,
      removeItem,
      clear,
    }),
    [cart, ready, addItem, changeQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Reads the cart context. Throws if used outside a {@link CartProvider}. */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return context;
}
