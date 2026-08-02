import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { PromotionalCreditGranter } from "../../domain/ports/promotional-credit-granter";
import { CustomerProfile } from "../../domain/entities/customer-profile";
import type { RetentionConfig } from "../retention-config";

/** Input for {@link RecordConfirmedOrder}: a confirmed order and who placed it. */
export type RecordConfirmedOrderInput = {
  customerUid: string;
  orderTotalCents: number;
};

/** Whether this order completed a streak and paid its bonus. */
export type RecordConfirmedOrderResult = { streakBonusGranted: boolean };

/**
 * Updates a customer's retention profile when one of their orders is confirmed:
 * it folds the order into their RFM figures and weekly streak (BR-21, BR-25),
 * and when the streak reaches its target it pays the streak bonus as store
 * credit and resets the counter. Keeping the profile current on each order is
 * what lets segmentation avoid scanning the order store.
 */
export class RecordConfirmedOrder
  implements UseCase<RecordConfirmedOrderInput, RecordConfirmedOrderResult>
{
  constructor(
    private readonly profiles: CustomerProfileRepository,
    private readonly granter: PromotionalCreditGranter,
    private readonly config: RetentionConfig
  ) {}

  async execute(
    input: RecordConfirmedOrderInput
  ): Promise<Result<RecordConfirmedOrderResult, DomainError>> {
    const existing = await this.profiles.findByUid(input.customerUid);
    const profile = existing ?? CustomerProfile.createNew(input.customerUid);

    const nowIso = new Date().toISOString();
    let updated = profile.recordOrder({
      orderTotalCents: input.orderTotalCents,
      nowIso,
      thresholds: this.config.rfm,
    });

    let streakBonusGranted = false;
    if (updated.streakWeeks >= this.config.streak.targetWeeks) {
      await this.granter.grant({
        entryId: `streak_${input.customerUid}_${updated.streakLastWeek}`,
        customerUid: input.customerUid,
        amountCents: this.config.streak.bonusCents,
        note: "Bono por racha",
        expiryDays: this.config.streak.bonusExpiryDays,
      });
      updated = updated.resetStreak();
      streakBonusGranted = true;
    }

    await this.profiles.save(updated);
    return ok({ streakBonusGranted });
  }
}
