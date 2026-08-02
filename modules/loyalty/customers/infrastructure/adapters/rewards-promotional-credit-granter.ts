import type { PromotionalCreditGranter } from "../../domain/ports/promotional-credit-granter";
import { makeGrantPromotionalCredit } from "@/modules/loyalty/rewards/infrastructure/di/rewards-container";

/**
 * RewardsPromotionalCreditGranter implements the retention context's
 * {@link PromotionalCreditGranter} port by driving the rewards module: a streak
 * bonus or win-back incentive is just a promotional wallet line. This adapter is
 * where the two bounded contexts meet, keeping the retention domain unaware of
 * how credit is stored.
 */
export class RewardsPromotionalCreditGranter implements PromotionalCreditGranter {
  async grant(input: {
    entryId: string;
    customerUid: string;
    amountCents: number;
    note: string;
    expiryDays: number;
  }): Promise<void> {
    await makeGrantPromotionalCredit().execute(input);
  }
}
