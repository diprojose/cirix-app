import type { PremiumPlanDto } from "../../application/dtos/premium-plan-dto";

/**
 * The premium subscription plan offered to customers. This is the single source
 * of truth for the price: change it here and every screen that shows the plan
 * updates. Placeholder value until real billing is wired — 499 cents = $4.99.
 */
export const PREMIUM_PLAN: PremiumPlanDto = {
  amountCents: 499,
  currency: "USD",
  interval: "monthly",
};
