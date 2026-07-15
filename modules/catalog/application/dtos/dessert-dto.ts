import type { Dessert } from "../../domain/entities/dessert";

/**
 * DessertDto is the plain, serializable view of a {@link Dessert} exposed by
 * use cases. Being a plain object (no class instances, no `Money` value
 * object), it can safely cross the RSC server→client boundary and be rendered
 * by any adapter without leaking domain types.
 */
export type DessertDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  available: boolean;
};

/** Maps a Dessert aggregate to its serializable DTO. */
export const toDessertDto = (dessert: Dessert): DessertDto => ({
  id: dessert.id.value,
  name: dessert.name,
  description: dessert.description,
  priceCents: dessert.price.amountCents,
  currency: dessert.price.currency,
  available: dessert.isAvailable,
});
