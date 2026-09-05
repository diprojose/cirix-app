import "server-only";
import { randomUUID } from "node:crypto";
import { adminStorage } from "@/shared/infrastructure/firebase-admin";

const MAX_LOGO_BYTES = 750 * 1024;
const EXTENSION_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type AllowedMime = keyof typeof EXTENSION_BY_TYPE;

function matchesSignature(bytes: Uint8Array, type: AllowedMime): boolean {
  if (type === "image/png") {
    return bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) =>
      byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]
    );
  }
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

/** Stores a small operator-uploaded logo and returns its stable download URL. */
export async function uploadBrandLogo(file: File, slug: string): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("El logo no puede superar 750 KB.");
  }
  if (!(file.type in EXTENSION_BY_TYPE)) {
    throw new Error("El logo debe ser PNG, JPEG o WebP.");
  }

  const type = file.type as AllowedMime;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(bytes, type)) {
    throw new Error("El archivo del logo no coincide con su formato declarado.");
  }

  const token = randomUUID();
  const bucket = adminStorage().bucket();
  const objectName = `brand-logos/${slug}/${randomUUID()}.${EXTENSION_BY_TYPE[type]}`;
  await bucket.file(objectName).save(Buffer.from(bytes), {
    resumable: false,
    contentType: type,
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
    bucket.name
  )}/o/${encodeURIComponent(objectName)}?alt=media&token=${token}`;
}
