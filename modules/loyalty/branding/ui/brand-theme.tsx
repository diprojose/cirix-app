import type { CSSProperties, ReactNode } from "react";
import type { BrandProfile } from "../application/brand-profile";
import {
  accessibleTextAcross,
  mixColors,
  readableText,
  readableTextAcross,
} from "../application/color-contrast";
import { BrandProvider } from "./brand-provider";

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function themeVariables(profile: BrandProfile): ThemeStyle {
  const surfaces = [profile.backgroundColor, profile.surfaceColor];
  const text = readableTextAcross(surfaces);
  const muted = accessibleTextAcross(
    mixColors(text, profile.surfaceColor, 0.42),
    surfaces,
  );
  const border = mixColors(text, profile.surfaceColor, 0.86);
  const accentText = accessibleTextAcross(profile.primaryColor, surfaces);
  const actionText = accessibleTextAcross(profile.accentColor, surfaces);
  const accentSoft = mixColors(
    profile.primaryColor,
    profile.surfaceColor,
    0.84,
  );
  const actionSoft = mixColors(profile.accentColor, profile.surfaceColor, 0.8);
  const onAccent = readableText(profile.primaryColor);
  const onAction = readableText(profile.accentColor);
  const accentFillStrong = mixColors(
    profile.primaryColor,
    onAccent === "#ffffff" ? "#000000" : "#ffffff",
    0.12,
  );
  const actionFillStrong = mixColors(
    profile.accentColor,
    onAction === "#ffffff" ? "#000000" : "#ffffff",
    0.12,
  );
  const primaryStrong = accessibleTextAcross(
    mixColors(profile.primaryColor, readableText(profile.surfaceColor), 0.16),
    [accentSoft],
  );
  const actionStrong = accessibleTextAcross(
    mixColors(profile.accentColor, readableText(profile.surfaceColor), 0.2),
    [actionSoft],
  );

  return {
    "--color-bg": profile.backgroundColor,
    "--color-surface": profile.surfaceColor,
    "--color-border": border,
    "--color-control-border": accessibleTextAcross(border, surfaces),
    "--color-focus": accentText,
    "--color-success": accessibleTextAcross("#167047", surfaces),
    "--color-warning": accessibleTextAcross("#986000", surfaces),
    "--color-danger": accessibleTextAcross("#bd2440", surfaces),
    "--color-danger-fill": "#bd2440",
    "--color-on-danger": "#ffffff",
    "--shadow-accent": `0 8px 24px -12px ${profile.primaryColor}66`,
    "--shadow-action": `0 8px 24px -12px ${profile.accentColor}66`,
    "--color-text": text,
    "--color-text-muted": muted,
    "--color-ink": profile.primaryColor,
    "--color-accent": accentText,
    "--color-accent-strong": primaryStrong,
    "--color-accent-fill": profile.primaryColor,
    "--color-accent-fill-strong": accentFillStrong,
    "--color-accent-soft": accentSoft,
    "--color-accent-subtle": mixColors(
      profile.primaryColor,
      profile.surfaceColor,
      0.94,
    ),
    "--color-on-accent": onAccent,
    "--color-action": actionText,
    "--color-action-strong": actionStrong,
    "--color-action-fill": profile.accentColor,
    "--color-action-fill-strong": actionFillStrong,
    "--color-action-soft": actionSoft,
    "--color-action-soft-strong": mixColors(
      profile.accentColor,
      profile.surfaceColor,
      0.7,
    ),
    "--color-action-subtle": mixColors(
      profile.accentColor,
      profile.surfaceColor,
      0.93,
    ),
    "--color-on-action": onAction,
    ...Object.fromEntries(
      ([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const).map(
        (step) => [
          `--color-action-${step}`,
          step === 500
            ? profile.accentColor
            : mixColors(
                profile.accentColor,
                step < 500 ? "#ffffff" : "#000000",
                Math.abs(step - 500) / 500,
              ),
        ],
      ),
    ),
    "--color-benefit": profile.secondaryColor,
    "--color-on-benefit": readableText(profile.secondaryColor),
    "--color-stone-0": profile.surfaceColor,
    "--color-stone-50": profile.backgroundColor,
    "--color-stone-100": mixColors(text, profile.surfaceColor, 0.93),
    "--color-stone-200": mixColors(text, profile.surfaceColor, 0.84),
    "--color-stone-300": mixColors(text, profile.surfaceColor, 0.72),
    "--color-stone-400": mixColors(text, profile.surfaceColor, 0.58),
    "--color-stone-500": muted,
    "--color-stone-600": mixColors(text, profile.surfaceColor, 0.28),
    "--color-stone-700": mixColors(text, profile.surfaceColor, 0.18),
    "--color-stone-800": mixColors(text, profile.surfaceColor, 0.1),
    "--color-stone-900": text,
    "--color-stone-950": text,
    "--brand-primary": profile.primaryColor,
    "--brand-secondary": profile.secondaryColor,
    "--brand-on-secondary": readableText(profile.secondaryColor),
    "--brand-accent": profile.accentColor,
  };
}

export function BrandTheme({
  profile,
  basePath = null,
  children,
}: {
  profile: BrandProfile;
  basePath?: string | null;
  children: ReactNode;
}) {
  return (
    <BrandProvider profile={profile} basePath={basePath}>
      <div
        style={themeVariables(profile)}
        className="min-h-dvh bg-bg text-text"
      >
        {children}
      </div>
    </BrandProvider>
  );
}
