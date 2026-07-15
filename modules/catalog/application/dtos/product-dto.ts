import type { Product } from "../../domain/entities/product";
import type { DepartmentName } from "../../domain/value-objects/department";

/**
 * ProductDto is the plain, serializable view of a {@link Product} exposed by
 * use cases. Being a plain object (no class instances, no `Money`/`Department`
 * value objects), it can safely cross the RSC server→client boundary and be
 * rendered by any adapter without leaking domain types.
 */
export type ProductDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  department: DepartmentName;
  imageUrl: string;
  featured: boolean;
  available: boolean;
};

/** Maps a Product aggregate to its serializable DTO. */
export const toProductDto = (product: Product): ProductDto => ({
  id: product.id.value,
  name: product.name,
  description: product.description,
  priceCents: product.price.amountCents,
  currency: product.price.currency,
  department: product.department.value,
  imageUrl: product.imageUrl,
  featured: product.isFeatured,
  available: product.isAvailable,
});
