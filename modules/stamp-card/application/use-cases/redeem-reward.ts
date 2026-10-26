import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ScanTokenSigner } from "../../domain/ports/scan-token-signer";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { NoRewardToRedeemError } from "../../domain/errors/stamp-card-errors";
import { resolveScanSubject } from "../resolve-scan-subject";
import { toStampCardDto, type StampCardDto } from "../dtos/stamp-card-dto";
import type { RecordStampInput } from "./record-stamp";

export type RedeemRewardOutput = { firstName: string; card: StampCardDto };

/**
 * Hands over a completed card's reward and restarts the card at zero. Redeeming
 * is safe to repeat: the second attempt finds no reward waiting and changes
 * nothing, so a double tap at the counter cannot give two rewards.
 */
export class RedeemReward implements UseCase<RecordStampInput, RedeemRewardOutput> {
  constructor(
    private readonly signer: ScanTokenSigner,
    private readonly customers: CustomerDirectory,
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly activity: CustomerActivityLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: RecordStampInput): Promise<Result<RedeemRewardOutput, DomainError>> {
    const now = this.now();
    const subject = await resolveScanSubject(this.signer, this.customers, input.businessId, input.token, now);
    if (!subject.ok) return subject;
    const { userId, customer } = subject.value;

    const program = await this.programs.get(input.businessId);
    const outcome = await this.cards.transact(input.businessId, userId, (current) =>
      current === null ? err(new NoRewardToRedeemError()) : current.redeem(program, input.staffUserId, now)
    );
    if (!outcome.ok) return outcome;

    const { card, redemption } = outcome.value;
    await this.activity
      .record({
        businessId: input.businessId,
        userId,
        type: "reward_redeemed",
        eventId: redemption.id,
        data: { reward: program.rewardName, staffId: input.staffUserId, redeemedCount: card.redeemedCount },
      })
      .catch(() => undefined);

    return ok({
      firstName: customer.firstName,
      card: toStampCardDto(card, program, input.businessId, userId, now),
    });
  }
}
