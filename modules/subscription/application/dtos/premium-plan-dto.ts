/**
 * PremiumPlanDto is the plain, serializable view of the premium subscription
 * plan shown to users. Being a plain object, it can cross the RSC server→client
 * boundary. The amount is kept in minor units (cents) and formatted at the edge,
 * matching how the catalog exposes prices.
 */
export type PremiumPlanDto = {
  amountCents: number;
  currency: string;
  interval: "monthly";
};
