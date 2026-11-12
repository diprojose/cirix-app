import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import {
  cardInk,
  imagesOf,
  InvalidCardDesignError,
  InvalidCardImageError,
  isCardImageId,
  parseCardDesign,
  TooManyCardImagesError,
  type CardDesign,
  type CardImageKind,
  type StampIconName,
} from "../domain/card-design";
import type { CardDesignRepository, CardImage, CardImageProcessor, CardImageStore } from "../domain/ports";

/**
 * Pictures uploaded but not yet saved in a design. The owner may try a few
 * before choosing; saving the design removes the ones left unused.
 */
export const MAX_STORED_IMAGES = 12;

/** Where the browser fetches a business's card picture. Public: the pictures are the business's branding. */
export const cardImageUrl = (businessId: string, imageId: string) => `/api/card-images/${businessId}/${imageId}`;

/** A design as the screen draws it: colours resolved and pictures as addresses. */
export type CardLook = {
  color: string;
  ink: string;
  logoUrl: string | null;
  coverUrl: string | null;
  stamp: { kind: "icon"; name: StampIconName } | { kind: "image"; url: string };
};

export function toCardLook(businessId: string, design: CardDesign): CardLook {
  return {
    color: design.color,
    ink: cardInk(design.color),
    logoUrl: design.logoId ? cardImageUrl(businessId, design.logoId) : null,
    coverUrl: design.coverId ? cardImageUrl(businessId, design.coverId) : null,
    stamp: design.stamp.kind === "icon" ? design.stamp : { kind: "image", url: cardImageUrl(businessId, design.stamp.imageId) },
  };
}

/** The design as the owner's form edits it, plus how it looks. */
export type CardDesignDto = { design: CardDesign; look: CardLook };

export class GetCardDesign implements UseCase<string, CardDesignDto> {
  constructor(private readonly designs: CardDesignRepository) {}

  async execute(businessId: string): Promise<Result<CardDesignDto, DomainError>> {
    const design = await this.designs.get(businessId);
    return ok({ design, look: toCardLook(businessId, design) });
  }
}

/** The owner saves the card's look. Every picture it names must be one of theirs, of the right kind. */
export class SaveCardDesign implements UseCase<{ businessId: string; design: unknown }, CardDesignDto> {
  constructor(
    private readonly designs: CardDesignRepository,
    private readonly images: CardImageStore
  ) {}

  async execute({ businessId, design: input }: { businessId: string; design: unknown }): Promise<Result<CardDesignDto, DomainError>> {
    const parsed = parseCardDesign(input);
    if (!parsed.ok) return parsed;
    const design = parsed.value;

    const wanted = imagesOf(design);
    const found = await this.images.kinds(businessId, wanted.map((image) => image.id));
    if (wanted.some((image) => found.get(image.id) !== image.kind)) return err(new InvalidCardDesignError("A picture of this design is missing."));

    await this.designs.save(businessId, design);
    // Pictures tried and not chosen go; a failure here only leaves them for the next save.
    await this.images.keepOnly(businessId, wanted.map((image) => image.id)).catch(() => undefined);
    return ok({ design, look: toCardLook(businessId, design) });
  }
}

export class UploadCardImage implements UseCase<{ businessId: string; kind: CardImageKind; file: Uint8Array }, { id: string; url: string }> {
  constructor(
    private readonly images: CardImageStore,
    private readonly processor: CardImageProcessor
  ) {}

  async execute({ businessId, kind, file }: { businessId: string; kind: CardImageKind; file: Uint8Array }): Promise<Result<{ id: string; url: string }, DomainError>> {
    if ((await this.images.count(businessId)) >= MAX_STORED_IMAGES) return err(new TooManyCardImagesError());
    const data = await this.processor.process(file, kind);
    if (data === null) return err(new InvalidCardImageError());
    const image: CardImage = { id: crypto.randomUUID(), kind, mime: "image/webp", data };
    await this.images.save(businessId, image);
    return ok({ id: image.id, url: cardImageUrl(businessId, image.id) });
  }
}

/** Anyone may fetch a card picture; an id that is not one simply finds nothing. */
export class ReadCardImage {
  constructor(private readonly images: CardImageStore) {}

  async execute(businessId: string, imageId: string): Promise<CardImage | null> {
    if (!isCardImageId(imageId) || !/^[A-Za-z0-9-]{1,64}$/.test(businessId)) return null;
    return this.images.get(businessId, imageId);
  }
}
