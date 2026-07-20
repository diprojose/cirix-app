import type { RewardRules } from "../value-objects/reward-rules";

/**
 * RewardRulesStore is the outbound port for the single, operator-maintained
 * reward configuration. It mirrors the pricing context's manual-rate store: one
 * settings record the admin panel writes and the rewards use cases read. `read`
 * never returns null — a missing record yields the built-in defaults — so the
 * program always has a valid rate, holdback and expiry to apply.
 */
export interface RewardRulesStore {
  /** The current rules, falling back to defaults when none are stored. */
  read(): Promise<RewardRules>;

  /** Persists the operator's rules, replacing any previous ones (BR-18). */
  write(rules: RewardRules): Promise<void>;
}
