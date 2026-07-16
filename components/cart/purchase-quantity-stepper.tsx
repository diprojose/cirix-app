"use client";

import { QuantityStepper } from "@/components/store/quantity-stepper";
import { useProductPurchase } from "./product-purchase-provider";

/**
 * PurchaseQuantityStepper binds the storefront {@link QuantityStepper} to the
 * product-scoped purchase context, so the quantity picked here is the quantity the
 * "Agregar al carrito" buttons add. Thin client wrapper: keeps the store stepper
 * generic (unaware of the cart) while wiring it on the product detail page.
 */
export function PurchaseQuantityStepper({ className }: { className?: string }) {
  const { quantity, setQuantity, maxQuantity } = useProductPurchase();

  return (
    <QuantityStepper
      value={quantity}
      onChange={setQuantity}
      max={maxQuantity}
      className={className}
    />
  );
}
