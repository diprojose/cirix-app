import type { CardDesign, CardImageKind } from "./card-design";

export interface CardDesignRepository {
  /** The saved design, or the default one. */
  get(businessId: string): Promise<CardDesign>;
  save(businessId: string, design: CardDesign): Promise<void>;
}

/** A picture ready to show: already resized and compressed. */
export type CardImage = { id: string; kind: CardImageKind; mime: "image/webp"; data: Uint8Array };

/**
 * Where a business's card pictures live. They are small (a few KB to ~200 KB)
 * and kept with the business's data, so they need no paid file storage.
 */
export interface CardImageStore {
  save(businessId: string, image: CardImage): Promise<void>;
  get(businessId: string, id: string): Promise<CardImage | null>;
  /** The kind of each existing picture among `ids`; missing ones are left out. */
  kinds(businessId: string, ids: readonly string[]): Promise<Map<string, CardImageKind>>;
  count(businessId: string): Promise<number>;
  /** Removes every picture of the business except these. */
  keepOnly(businessId: string, ids: readonly string[]): Promise<void>;
}

/** Turns an uploaded file into what the card shows. Null when it is not an image it can open. */
export interface CardImageProcessor {
  process(file: Uint8Array, kind: CardImageKind): Promise<Uint8Array | null>;
}
