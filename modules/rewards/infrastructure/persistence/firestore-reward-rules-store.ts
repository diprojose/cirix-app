import type { Firestore } from "firebase-admin/firestore";
import { RewardRules } from "../../domain/value-objects/reward-rules";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { defaultRewardRules } from "../config/reward-rules-defaults";

/** Single settings document holding the operator's reward configuration. */
const DOC_PATH = "settings/rewards";

/** The Firestore shape of the reward rules. */
type RewardRulesDocument = {
  earnRatePctOfMargin: number;
  holdbackDays: number;
  expiryDays: number;
  maxRedeemPctOfOrder: number;
  updatedAt: string;
};

/**
 * FirestoreRewardRulesStore is the production adapter for the
 * {@link RewardRulesStore} port: one settings document the admin panel writes
 * and the rewards use cases read. A missing or invalid document falls back to
 * the built-in defaults, so the program always has a valid configuration to
 * apply — mirroring the pricing context's manual-rate store.
 */
export class FirestoreRewardRulesStore implements RewardRulesStore {
  constructor(private readonly firestore: Firestore) {}

  async read(): Promise<RewardRules> {
    const snapshot = await this.firestore.doc(DOC_PATH).get();
    if (!snapshot.exists) {
      return defaultRewardRules();
    }

    const data = snapshot.data() as RewardRulesDocument;
    const result = RewardRules.create({
      earnRatePctOfMargin: data.earnRatePctOfMargin,
      holdbackDays: data.holdbackDays,
      expiryDays: data.expiryDays,
      maxRedeemPctOfOrder: data.maxRedeemPctOfOrder,
    });
    // A corrupt settings doc must not break earn/redeem — fall back to defaults.
    return result.ok ? result.value : defaultRewardRules();
  }

  async write(rules: RewardRules): Promise<void> {
    const document: RewardRulesDocument = {
      earnRatePctOfMargin: rules.earnRatePctOfMargin,
      holdbackDays: rules.holdbackDays,
      expiryDays: rules.expiryDays,
      maxRedeemPctOfOrder: rules.maxRedeemPctOfOrder,
      updatedAt: new Date().toISOString(),
    };
    await this.firestore.doc(DOC_PATH).set(document);
  }
}
