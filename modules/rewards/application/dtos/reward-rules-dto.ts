import type { RewardRules } from "../../domain/value-objects/reward-rules";

/**
 * RewardRulesDto is the plain, serializable view of the reward configuration,
 * exposed to the admin panel and read back by the checkout/confirmation UI. It
 * mirrors the {@link RewardRules} value object field-for-field without leaking
 * the domain type across the RSC boundary.
 */
export type RewardRulesDto = {
  earnRatePctOfMargin: number;
  holdbackDays: number;
  expiryDays: number;
  maxRedeemPctOfOrder: number;
};

/** Maps the reward rules value object to its serializable DTO. */
export const toRewardRulesDto = (rules: RewardRules): RewardRulesDto => ({
  earnRatePctOfMargin: rules.earnRatePctOfMargin,
  holdbackDays: rules.holdbackDays,
  expiryDays: rules.expiryDays,
  maxRedeemPctOfOrder: rules.maxRedeemPctOfOrder,
});
