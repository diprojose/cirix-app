import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { StampCard } from "../../domain/entities/stamp-card";
import { ProgramInactiveError, RewardPendingError, StampTooSoonError } from "../../domain/errors/stamp-card-errors";

export type GrantReceiptStampInput = { businessId: string; userId: string };
export type GrantReceiptStampOutput = { stamps: number; required: number; rewardUnlocked: boolean };

/**
 * A verified receipt earns one stamp. The receipts module proves the purchase;
 * this applies the same atomic rules as every other stamp, so a receipt and a
 * table QR in the same visit do not add up.
 */
export class GrantReceiptStamp implements UseCase<GrantReceiptStampInput, GrantReceiptStampOutput> {
  constructor(
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly activity: CustomerActivityLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** Why a stamp could not be given right now, if so; the atomic check is still the one in `execute`. */
  async check({ businessId, userId }: GrantReceiptStampInput): Promise<Result<void, DomainError>> {
    const now = this.now();
    const [program, card] = await Promise.all([this.programs.get(businessId), this.cards.find(businessId, userId)]);
    if (!program.active) return err(new ProgramInactiveError());
    const status = (card ?? StampCard.empty(businessId, userId, now)).status(program, now);
    if (status.canRedeem) return err(new RewardPendingError());
    if (status.retryAfterSeconds > 0) return err(new StampTooSoonError(status.retryAfterSeconds));
    return ok(undefined);
  }

  async execute({ businessId, userId }: GrantReceiptStampInput): Promise<Result<GrantReceiptStampOutput, DomainError>> {
    const now = this.now();
    const program = await this.programs.get(businessId);
    const outcome = await this.cards.transact(businessId, userId, (card) =>
      (card ?? StampCard.empty(businessId, userId, now)).stamp(program, null, now, "receipt")
    );
    if (!outcome.ok) return outcome;

    const { card, stamp, rewardUnlocked } = outcome.value;
    // The timeline is a convenience copy: a failure here must never undo the stamp.
    await this.activity
      .record({
        businessId,
        userId,
        type: "stamp_added",
        eventId: stamp.id,
        data: { stamps: card.displayStamps(program), required: program.requiredStamps, sequence: stamp.sequence, source: "receipt" },
      })
      .catch(() => undefined);
    if (rewardUnlocked) {
      await this.activity
        .record({ businessId, userId, type: "reward_unlocked", eventId: `unlocked-${stamp.id}`, data: { reward: program.rewardName } })
        .catch(() => undefined);
    }
    return ok({ stamps: card.displayStamps(program), required: program.requiredStamps, rewardUnlocked });
  }
}
