import "server-only";
import sharp, { type Sharp } from "sharp";
import type { CardImageKind } from "../domain/card-design";
import type { CardImageProcessor } from "../domain/ports";

/** Refuses image bombs before decoding them. A phone photo is well under this. */
const MAX_INPUT_PIXELS = 50_000_000;
/** A Firestore document holds 1 MiB; a picture this size would never need it all. */
const MAX_OUTPUT_BYTES = 600 * 1024;

/**
 * Each picture at the size the card shows it, twice over for sharp phone
 * screens, as WebP. Logos and stamps keep their transparency.
 */
const PREPARE: Record<CardImageKind, (image: Sharp) => Sharp> = {
  logo: (image) => image.resize({ width: 480, height: 192, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }),
  cover: (image) => image.resize({ width: 1080, height: 600, fit: "cover", position: "attention" }).webp({ quality: 78 }),
  stamp: (image) =>
    image.resize({ width: 192, height: 192, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }),
};

/**
 * A logo or stamp loses the empty margin around it (transparent or plain), so
 * it sits where the card puts it instead of floating inside its own frame.
 */
async function trimmed(file: Uint8Array): Promise<Buffer> {
  const upright = await sharp(file, { limitInputPixels: MAX_INPUT_PIXELS }).rotate().png().toBuffer();
  try {
    return await sharp(upright).trim({ threshold: 10 }).png().toBuffer();
  } catch {
    // A picture of one plain colour has nothing to trim.
    return upright;
  }
}

export class SharpCardImageProcessor implements CardImageProcessor {
  async process(file: Uint8Array, kind: CardImageKind): Promise<Uint8Array | null> {
    try {
      const source = kind === "cover" ? sharp(file, { limitInputPixels: MAX_INPUT_PIXELS }).rotate() : sharp(await trimmed(file));
      const output = await PREPARE[kind](source).toBuffer();
      return output.length <= MAX_OUTPUT_BYTES ? new Uint8Array(output) : null;
    } catch {
      return null;
    }
  }
}
