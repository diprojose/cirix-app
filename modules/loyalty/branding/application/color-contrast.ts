type RGB = { r: number; g: number; b: number };

const DARK_TEXT = "#10231c";
const BLACK_TEXT = "#000000";
const LIGHT_TEXT = "#ffffff";

function fromHex(hex: string): RGB {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: RGB): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function mixColors(a: string, b: string, weight: number): string {
  const left = fromHex(a);
  const right = fromHex(b);
  return toHex({
    r: left.r * (1 - weight) + right.r * weight,
    g: left.g * (1 - weight) + right.g * weight,
    b: left.b * (1 - weight) + right.b * weight,
  });
}

function luminance(hex: string): number {
  const rgb = fromHex(hex);
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground: string, background: string): number {
  const [high, low] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (high + 0.05) / (low + 0.05);
}

function minimumContrast(foreground: string, backgrounds: string[]): number {
  return Math.min(
    ...backgrounds.map((background) => contrastRatio(foreground, background))
  );
}

export function readableText(background: string): string {
  return contrastRatio(BLACK_TEXT, background) >= contrastRatio(LIGHT_TEXT, background)
    ? BLACK_TEXT
    : LIGHT_TEXT;
}

/** Selects one foreground that remains readable on both page surfaces. */
export function readableTextAcross(backgrounds: string[]): string {
  return minimumContrast(DARK_TEXT, backgrounds) >=
    minimumContrast(LIGHT_TEXT, backgrounds)
    ? DARK_TEXT
    : LIGHT_TEXT;
}

export function supportsSharedReadableText(backgrounds: string[]): boolean {
  return minimumContrast(readableTextAcross(backgrounds), backgrounds) >= 4.5;
}

/** Preserves a palette color when possible, then nudges it toward readable text. */
export function accessibleTextAcross(
  color: string,
  backgrounds: string[]
): string {
  if (minimumContrast(color, backgrounds) >= 4.5) return color;
  const target = readableTextAcross(backgrounds);
  for (let step = 1; step <= 10; step += 1) {
    const candidate = mixColors(color, target, step / 10);
    if (minimumContrast(candidate, backgrounds) >= 4.5) return candidate;
  }
  return target;
}
