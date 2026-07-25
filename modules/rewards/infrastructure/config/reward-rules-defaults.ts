import { RewardRules } from "../../domain/value-objects/reward-rules";

/** The program's out-of-the-box configuration, used until an operator saves their own. */
const DEFAULTS = {
  earnRatePctOfMargin: 5,
  holdbackDays: 7,
  expiryDays: 90,
  maxRedeemPctOfOrder: 50,
};

/**
 * Builds the default reward rules. These are valid by construction; an invalid
 * default throws immediately at startup, surfacing the mistake early instead of
 * silently shipping a broken program configuration.
 */
export function defaultRewardRules(): RewardRules {
  const result = RewardRules.create(DEFAULTS);
  if (!result.ok) {
    throw new Error(`Invalid default reward rules: ${result.error.message}`);
  }
  return result.value;
}
