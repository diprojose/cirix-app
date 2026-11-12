import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { GetCardDesign, ReadCardImage, SaveCardDesign, UploadCardImage } from "../application/card-design-use-cases";
import type { CardDesignRepository, CardImageStore } from "../domain/ports";
import { FirestoreCardDesignRepository, FirestoreCardImageStore } from "./firestore-card-design";

/* Composition root for card designs: the only place that knows the concrete adapters. Server-only. */

let designs: CardDesignRepository | null = null;
let images: CardImageStore | null = null;
const designRepository = () => (designs ??= new FirestoreCardDesignRepository(adminFirestore()));
const imageStore = () => (images ??= new FirestoreCardImageStore(adminFirestore()));

export const makeGetCardDesign = (): GetCardDesign => new GetCardDesign(designRepository());
export const makeSaveCardDesign = (): SaveCardDesign => new SaveCardDesign(designRepository(), imageStore());
export const makeReadCardImage = (): ReadCardImage => new ReadCardImage(imageStore());

/** Loads sharp only where pictures are uploaded. */
export const makeUploadCardImage = async (): Promise<UploadCardImage> => {
  const { SharpCardImageProcessor } = await import("./sharp-card-image-processor");
  return new UploadCardImage(imageStore(), new SharpCardImageProcessor());
};
