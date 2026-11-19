import "server-only";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeGetCardDesign } from "@/modules/card-design/infrastructure/card-design-container";
import { toCardLook } from "@/modules/card-design/application/card-design-use-cases";
import { DEFAULT_CARD_DESIGN } from "@/modules/card-design/domain/card-design";

/** What the sign-in screen borrows from the business whose QR brought the person. */
export type LoginBusinessBrand = {
  name: string;
  color: string;
  /** Text colour that reads on `color`. */
  ink: string;
  logoUrl: string | null;
  /** Signing up from the QR, or coming back to a card they already have. */
  purpose: "join" | "card";
};

/**
 * The business behind a return path, when the person is on their way to one:
 * its signup page (`/b/<slug>`) or their card or points there. The path has
 * already been made internal and stripped of its locale.
 */
export function businessFromReturnPath(path: string | null): { slug: string; purpose: "join" | "card" } | null {
  if (path === null) return null;
  const match = /^\/(b|me\/(?:cards|points))\/([a-z0-9-]+)\/?$/i.exec(path);
  if (!match) return null;
  return { slug: match[2].toLowerCase(), purpose: match[1].toLowerCase() === "b" ? "join" : "card" };
}

/**
 * The business's name, colour and logo for the sign-in screen, or null to show
 * Cirix's own. Unknown and suspended businesses get Cirix's screen, and so does
 * any failure: signing in must never depend on a business's look.
 */
export async function loadLoginBusinessBrand(path: string | null): Promise<LoginBusinessBrand | null> {
  const target = businessFromReturnPath(path);
  if (target === null) return null;
  try {
    const business = await makeGetBusinessBySlug().execute(target.slug);
    if (!business.ok) return null;
    const design = await makeGetCardDesign().execute(business.value.id);
    const look = design.ok ? design.value.look : toCardLook(business.value.id, DEFAULT_CARD_DESIGN);
    return { name: business.value.name, color: look.color, ink: look.ink, logoUrl: look.logoUrl, purpose: target.purpose };
  } catch {
    return null;
  }
}
