import { err, ok, type Result } from "@/shared/domain/result";
import { DomainError } from "@/shared/domain/domain-error";

/*
 * How a business's loyalty card looks to its customers: its colour, its logo, a
 * cover photo and the picture each visit leaves on the card. The same design
 * dresses the restaurant's visit card and the supermarket's points card.
 */

/** Pictures drawn in code, for businesses without one of their own. */
export const STAMP_ICONS = [
  "star",
  "coffee",
  "burger",
  "pizza",
  "taco",
  "icecream",
  "cupcake",
  "bread",
  "drink",
  "beer",
  "heart",
  "leaf",
] as const;
export type StampIconName = (typeof STAMP_ICONS)[number];

export type CardImageKind = "logo" | "cover" | "stamp";

/** What a visit leaves on the card: a drawn icon, or the business's own picture. */
export type StampLook = { kind: "icon"; name: StampIconName } | { kind: "image"; imageId: string };

export type CardDesign = {
  /** The card's background, `#rrggbb`. */
  color: string;
  logoId: string | null;
  coverId: string | null;
  stamp: StampLook;
};

/** Cirix blue with a star: how every card looks until its owner designs it. */
export const DEFAULT_CARD_DESIGN: CardDesign = { color: "#1c5aae", logoId: null, coverId: null, stamp: { kind: "icon", name: "star" } };

export class InvalidCardDesignError extends DomainError {
  readonly code = "card-design/invalid";

  constructor(message = "This card design is not valid.") {
    super(message);
  }
}

export class InvalidCardImageError extends DomainError {
  readonly code = "card-design/invalid-image";

  constructor() {
    super("The file is not an image we can use.");
  }
}

export class TooManyCardImagesError extends DomainError {
  readonly code = "card-design/too-many-images";

  constructor() {
    super("Save the design before uploading more pictures.");
  }
}

const HEX = /^#[0-9a-f]{6}$/;
const IMAGE_ID = /^[0-9a-f-]{36}$/;

export const isCardImageId = (value: unknown): value is string => typeof value === "string" && IMAGE_ID.test(value);

/** Checks the shape of a design sent from the owner's form. Whether its pictures exist is the use case's job. */
export function parseCardDesign(input: unknown): Result<CardDesign, InvalidCardDesignError> {
  const value = (input ?? {}) as Record<string, unknown>;
  const color = typeof value.color === "string" ? value.color.trim().toLowerCase() : "";
  if (!HEX.test(color)) return err(new InvalidCardDesignError("The colour must be #rrggbb."));

  const optionalImage = (field: unknown) => (field === null || field === undefined ? null : isCardImageId(field) ? field : undefined);
  const logoId = optionalImage(value.logoId);
  const coverId = optionalImage(value.coverId);
  if (logoId === undefined || coverId === undefined) return err(new InvalidCardDesignError());

  const stamp = (value.stamp ?? {}) as Record<string, unknown>;
  let look: StampLook;
  if (stamp.kind === "icon" && STAMP_ICONS.includes(stamp.name as StampIconName)) look = { kind: "icon", name: stamp.name as StampIconName };
  else if (stamp.kind === "image" && isCardImageId(stamp.imageId)) look = { kind: "image", imageId: stamp.imageId };
  else return err(new InvalidCardDesignError());

  return ok({ color, logoId, coverId, stamp: look });
}

/** The pictures a design shows, by the kind each must be. */
export function imagesOf(design: CardDesign): { id: string; kind: CardImageKind }[] {
  return [
    ...(design.logoId ? [{ id: design.logoId, kind: "logo" as const }] : []),
    ...(design.coverId ? [{ id: design.coverId, kind: "cover" as const }] : []),
    ...(design.stamp.kind === "image" ? [{ id: design.stamp.imageId, kind: "stamp" as const }] : []),
  ];
}

/** The name printed on the card: the first word, so a long full name fits. */
export function firstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0];
  return first ? first.slice(0, 20) : null;
}

function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** White or near-black, whichever reads better on the card's colour. */
export function cardInk(color: string): "#ffffff" | "#16181b" {
  const background = luminance(color);
  const onWhite = 1.05 / (background + 0.05);
  const onDark = (background + 0.05) / (luminance("#16181b") + 0.05);
  return onWhite >= onDark ? "#ffffff" : "#16181b";
}

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** `color` blended toward `target` by `amount` (0 keeps it, 1 is all target). */
function mix(color: string, target: string, amount: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
  return `#${[1, 3, 5]
    .map((index) => Math.round(channel(color, index) + (channel(target, index) - channel(color, index)) * amount))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** The colour darkened just enough to reach `ratio` against white. */
function darkenedTo(color: string, ratio: number): string {
  for (let step = 0; step <= 20; step++) {
    const candidate = mix(color, "#000000", step / 20);
    if (contrast(candidate, "#ffffff") >= ratio) return candidate;
  }
  return "#000000";
}

/**
 * The app's accent colours taken from a business's card, so its buttons, links
 * and highlights match its brand. Buttons keep the exact colour unless it is so
 * pale (cream, beige) that it melts into the light background: then they take a
 * deeper shade of it, enough to stand out as a control (3:1). Text and outlines
 * are darkened until they pass WCAG AA, so a yellow brand still gives readable
 * links.
 */
export type BrandPalette = {
  fill: string;
  fillStrong: string;
  onFill: "#ffffff" | "#16181b";
  text: string;
  textStrong: string;
  soft: string;
  subtle: string;
};

/** Below this contrast with white a colour reads as background, not as a button. */
const PALE_BELOW = 1.5;

export function brandPalette(color: string): BrandPalette {
  const text = darkenedTo(color, 4.5);
  const exact = mix(color, "#000000", 0);
  const fill = contrast(exact, "#ffffff") < PALE_BELOW ? darkenedTo(exact, 3) : exact;
  return {
    fill,
    fillStrong: mix(fill, "#000000", 0.14),
    onFill: cardInk(fill),
    text,
    textStrong: darkenedTo(text, 7),
    soft: mix(color, "#ffffff", 0.84),
    subtle: mix(color, "#ffffff", 0.94),
  };
}
