import type { Business } from "../../domain/entities/business";
import type { BusinessKind, BusinessStatus } from "../../domain/value-objects/business-kind";
import type { BusinessRole } from "../../domain/value-objects/member-role";

/**
 * Public view of a business. It contains only what a QR landing page may show
 * to anyone: never member lists, emails or internal settings.
 */
export type BusinessDto = {
  id: string;
  slug: string;
  name: string;
  kind: BusinessKind;
  status: BusinessStatus;
};

/** A business together with the role the viewer holds in it. */
export type BusinessAccessDto = {
  business: BusinessDto;
  role: BusinessRole;
};

export const toBusinessDto = (business: Business): BusinessDto => ({
  id: business.id.value,
  slug: business.slug.value,
  name: business.name,
  kind: business.kind,
  status: business.status,
});
