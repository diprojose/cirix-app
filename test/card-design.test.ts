import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

import {
  brandPalette,
  cardInk,
  DEFAULT_CARD_DESIGN,
  firstName,
  parseCardDesign,
} from "@/modules/card-design/domain/card-design";
import {
  GetCardDesign,
  MAX_STORED_IMAGES,
  ReadCardImage,
  SaveCardDesign,
  UploadCardImage,
} from "@/modules/card-design/application/card-design-use-cases";
import {
  InMemoryCardDesignRepository,
  InMemoryCardImageStore,
  PassThroughCardImageProcessor,
} from "@/modules/card-design/infrastructure/in-memory-card-design";
import { SharpCardImageProcessor } from "@/modules/card-design/infrastructure/sharp-card-image-processor";
import { isPublicAsset } from "@/lib/auth/route-access";

const BIZ = "0b9a6c1e-6a52-4c58-9a63-1f3f1b1e2a10";
const OTHER = "7d2f4f8e-1c1a-4a0e-8f2e-2b6c9e0d4c33";
const FILE = new Uint8Array([1, 2, 3]);

/** WCAG contrast ratio, written out here so the test does not trust the code it checks. */
function contrastOf(a: string, b: string): number {
  const lum = (hex: string) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

let designs: InMemoryCardDesignRepository;
let images: InMemoryCardImageStore;
const upload = (kind: "logo" | "cover" | "stamp", businessId = BIZ) =>
  new UploadCardImage(images, new PassThroughCardImageProcessor()).execute({ businessId, kind, file: FILE });
const save = (design: unknown, businessId = BIZ) => new SaveCardDesign(designs, images).execute({ businessId, design });
const idOf = async (kind: "logo" | "cover" | "stamp", businessId = BIZ) => {
  const result = await upload(kind, businessId);
  if (!result.ok) throw result.error;
  return result.value.id;
};

beforeEach(() => {
  designs = new InMemoryCardDesignRepository();
  images = new InMemoryCardImageStore();
});

describe("a card design", () => {
  it("starts as Cirix blue with a star", async () => {
    const result = await new GetCardDesign(designs).execute(BIZ);
    expect(result.ok && result.value.design).toEqual(DEFAULT_CARD_DESIGN);
    expect(result.ok && result.value.look).toMatchObject({ color: "#1c5aae", ink: "#ffffff", logoUrl: null, stamp: { kind: "icon", name: "star" } });
  });

  it("accepts a colour, a gallery icon and no pictures", () => {
    const parsed = parseCardDesign({ color: "#C62828", logoId: null, coverId: null, stamp: { kind: "icon", name: "burger" } });
    expect(parsed.ok && parsed.value).toEqual({ color: "#c62828", logoId: null, coverId: null, stamp: { kind: "icon", name: "burger" } });
  });

  it.each([
    [{ color: "red", stamp: { kind: "icon", name: "star" } }],
    [{ color: "#123456", stamp: { kind: "icon", name: "rocket" } }],
    [{ color: "#123456", logoId: "../../etc", stamp: { kind: "icon", name: "star" } }],
    [{ color: "#123456", stamp: { kind: "image", imageId: "not-an-id" } }],
  ])("refuses %j", (input) => {
    expect(parseCardDesign(input).ok).toBe(false);
  });

  it("prints white on dark colours and near-black on pale ones", () => {
    expect(cardInk("#1c5aae")).toBe("#ffffff");
    expect(cardInk("#16181b")).toBe("#ffffff");
    expect(cardInk("#f9a825")).toBe("#16181b");
    expect(cardInk("#f4ead5")).toBe("#16181b");
  });

  it.each(["#c62828", "#f9a825", "#f4ead5", "#1c5aae", "#2e7d32"])("lends %s to the app's buttons and readable links", (color) => {
    const palette = brandPalette(color);
    // Buttons stand out from the white page, with the ink that reads best on them.
    expect(contrastOf(palette.fill, "#ffffff")).toBeGreaterThanOrEqual(1.5);
    expect(palette.onFill).toBe(cardInk(palette.fill));
    expect(contrastOf(palette.onFill, palette.fill)).toBeGreaterThanOrEqual(4.5);
    // Links and outlines on the white background pass WCAG AA, even for a yellow brand.
    expect(contrastOf(palette.text, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastOf(palette.textStrong, "#ffffff")).toBeGreaterThanOrEqual(7);
  });

  it("keeps a brand's exact colour on buttons unless it would melt into the page", () => {
    expect(brandPalette("#c62828").fill).toBe("#c62828");
    expect(brandPalette("#f9a825").fill).toBe("#f9a825");
    // Cream would vanish on the light background: buttons take a deeper shade of it.
    const cream = brandPalette("#f4ead5");
    expect(cream.fill).not.toBe("#f4ead5");
    expect(contrastOf(cream.fill, "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("keeps a dark brand's links in its own colour", () => {
    expect(brandPalette("#c62828").text).toBe("#c62828");
    expect(brandPalette("#f9a825").text).not.toBe("#f9a825");
  });

  it("prints the customer's first name", () => {
    expect(firstName("  Ana María Prueba ")).toBe("Ana");
    expect(firstName("")).toBeNull();
  });
});

describe("saving a design", () => {
  it("shows the uploaded logo, cover and stamp", async () => {
    const [logoId, coverId, stampId] = [await idOf("logo"), await idOf("cover"), await idOf("stamp")];
    const result = await save({ color: "#2e7d32", logoId, coverId, stamp: { kind: "image", imageId: stampId } });
    expect(result.ok && result.value.look).toEqual({
      color: "#2e7d32",
      ink: "#ffffff",
      logoUrl: `/api/card-images/${BIZ}/${logoId}`,
      coverUrl: `/api/card-images/${BIZ}/${coverId}`,
      stamp: { kind: "image", url: `/api/card-images/${BIZ}/${stampId}` },
    });
  });

  it("refuses a picture that does not exist, is of another kind, or belongs to another business", async () => {
    const missing = crypto.randomUUID();
    expect((await save({ color: "#2e7d32", logoId: missing, stamp: { kind: "icon", name: "star" } })).ok).toBe(false);
    const cover = await idOf("cover");
    expect((await save({ color: "#2e7d32", logoId: cover, stamp: { kind: "icon", name: "star" } })).ok).toBe(false);
    const theirs = await idOf("logo", OTHER);
    expect((await save({ color: "#2e7d32", logoId: theirs, stamp: { kind: "icon", name: "star" } })).ok).toBe(false);
    expect(designs.designs.size).toBe(0);
  });

  it("removes the pictures tried and not chosen, and only this business's", async () => {
    const tried = await idOf("logo");
    const chosen = await idOf("logo");
    const theirs = await idOf("logo", OTHER);
    await save({ color: "#2e7d32", logoId: chosen, stamp: { kind: "icon", name: "star" } });
    expect(await images.get(BIZ, tried)).toBeNull();
    expect(await images.get(BIZ, chosen)).not.toBeNull();
    expect(await images.get(OTHER, theirs)).not.toBeNull();
  });

  it("caps the pictures waiting to be saved", async () => {
    for (let index = 0; index < MAX_STORED_IMAGES; index += 1) await idOf("cover");
    const refused = await upload("cover");
    expect(!refused.ok && refused.error.code).toBe("card-design/too-many-images");
  });
});

describe("serving a picture", () => {
  it("finds only well-formed ids", async () => {
    const id = await idOf("logo");
    const reader = new ReadCardImage(images);
    expect(await reader.execute(BIZ, id)).not.toBeNull();
    expect(await reader.execute(BIZ, "../settings/card_design")).toBeNull();
    expect(await reader.execute("biz/../../x", id)).toBeNull();
  });

  it("is public, so the signup page shows it before signing in", () => {
    expect(isPublicAsset(`/api/card-images/${BIZ}/${crypto.randomUUID()}`)).toBe(true);
    expect(isPublicAsset("/api/member/biz/x/design")).toBe(false);
  });
});

describe("preparing pictures", () => {
  const processor = new SharpCardImageProcessor();

  it("keeps a logo's transparency and caps its size", async () => {
    const logo = await sharp({ create: { width: 2000, height: 800, channels: 4, background: { r: 200, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const output = await processor.process(new Uint8Array(logo), "logo");
    const meta = await sharp(output!).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 480, height: 192, hasAlpha: true });
  });

  it("crops a cover to the card's strip", async () => {
    const photo = await sharp({ create: { width: 3000, height: 4000, channels: 3, background: "#884422" } }).jpeg().toBuffer();
    const meta = await sharp((await processor.process(new Uint8Array(photo), "cover"))!).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 1080, height: 600 });
  });

  it("refuses what is not an image", async () => {
    expect(await processor.process(new TextEncoder().encode("<svg onload=alert(1)>"), "stamp")).toBeNull();
  });
});
