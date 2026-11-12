import { DEFAULT_CARD_DESIGN, type CardDesign, type CardImageKind } from "../domain/card-design";
import type { CardDesignRepository, CardImage, CardImageProcessor, CardImageStore } from "../domain/ports";

export class InMemoryCardDesignRepository implements CardDesignRepository {
  readonly designs = new Map<string, CardDesign>();

  async get(businessId: string): Promise<CardDesign> {
    return this.designs.get(businessId) ?? DEFAULT_CARD_DESIGN;
  }

  async save(businessId: string, design: CardDesign): Promise<void> {
    this.designs.set(businessId, design);
  }
}

export class InMemoryCardImageStore implements CardImageStore {
  readonly images = new Map<string, CardImage>();

  async save(businessId: string, image: CardImage): Promise<void> {
    this.images.set(`${businessId}/${image.id}`, image);
  }

  async get(businessId: string, id: string): Promise<CardImage | null> {
    return this.images.get(`${businessId}/${id}`) ?? null;
  }

  async kinds(businessId: string, ids: readonly string[]): Promise<Map<string, CardImageKind>> {
    const found = new Map<string, CardImageKind>();
    for (const id of ids) {
      const image = this.images.get(`${businessId}/${id}`);
      if (image) found.set(id, image.kind);
    }
    return found;
  }

  async count(businessId: string): Promise<number> {
    return [...this.images.keys()].filter((key) => key.startsWith(`${businessId}/`)).length;
  }

  async keepOnly(businessId: string, ids: readonly string[]): Promise<void> {
    for (const key of [...this.images.keys()]) {
      if (key.startsWith(`${businessId}/`) && !ids.includes(key.slice(businessId.length + 1))) this.images.delete(key);
    }
  }
}

/** Accepts anything that is not empty, as is. */
export class PassThroughCardImageProcessor implements CardImageProcessor {
  async process(file: Uint8Array): Promise<Uint8Array | null> {
    return file.length > 0 ? file : null;
  }
}
