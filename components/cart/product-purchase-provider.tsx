"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { MAX_QUANTITY } from "@/modules/loyalty/cart/domain/value-objects/quantity";
import { useCart } from "./cart-provider";

/** What the product-purchase context exposes on a product detail page. */
type ProductPurchaseContextValue = {
  product: ProductDto;
  quantity: number;
  maxQuantity: number;
  setQuantity: (next: number) => void;
  /** Adds the product at the currently selected quantity; resolves success. */
  addToCart: () => Promise<boolean>;
};

const ProductPurchaseContext = createContext<ProductPurchaseContextValue | null>(
  null
);

/**
 * ProductPurchaseProvider is a product-scoped client provider that shares the
 * selected quantity across the (spatially separated) quantity stepper and the
 * desktop/mobile "Agregar al carrito" buttons on a product detail page. It binds
 * that quantity to the global cart via {@link useCart}, so a single "add" reflects
 * the chosen amount. Wrap the product page's interactive region with it.
 */
export function ProductPurchaseProvider({
  product,
  children,
}: {
  product: ProductDto;
  children: ReactNode;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const addToCart = useCallback(
    () =>
      addItem({
        productId: product.id,
        name: product.name,
        unitPriceCents: product.priceCents,
        currency: product.currency,
        imageUrl: product.imageUrl,
        quantity,
      }),
    [addItem, product, quantity]
  );

  const value = useMemo<ProductPurchaseContextValue>(
    () => ({
      product,
      quantity,
      maxQuantity: MAX_QUANTITY,
      setQuantity,
      addToCart,
    }),
    [product, quantity, addToCart]
  );

  return (
    <ProductPurchaseContext.Provider value={value}>
      {children}
    </ProductPurchaseContext.Provider>
  );
}

/** Reads the product-purchase context. Throws if used outside its provider. */
export function useProductPurchase(): ProductPurchaseContextValue {
  const context = useContext(ProductPurchaseContext);
  if (context === null) {
    throw new Error(
      "useProductPurchase must be used within a ProductPurchaseProvider."
    );
  }
  return context;
}
