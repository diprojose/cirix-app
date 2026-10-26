import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ScanTokenSigner } from "../../domain/ports/scan-token-signer";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { StampCard } from "../../domain/entities/stamp-card";
import { resolveScanSubject } from "../resolve-scan-subject";
import { toStampCardDto, type StampCardDto } from "../dtos/stamp-card-dto";

export type RecordStampInput = {
  businessId: string;
  token: string;
  /** The employee giving the stamp, from the verified session. */
  staffUserId: string;
};

export type RecordStampOutput = {
  firstName: string;
  card: StampCardDto;
  /** True when this stamp completed the card. */
  rewardUnlocked: boolean;
};

/**
 * Gives a customer one stamp after staff scanned their code. The cooldown and
 * the pending-reward rule are enforced inside the repository's atomic step, so
 * two scans of the same code, or two employees at once, add at most one stamp.
 */
export class RecordStamp implements UseCase<RecordStampInput, RecordStampOutput> {
  constructor(
    private readonly signer: ScanTokenSigner,
    private readonly customers: CustomerDirectory,
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly activity: CustomerActivityLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: RecordStampInput): Promise<Result<RecordStampOutput, DomainError>> {
    const now = this.now();
    const subject = await resolveScanSubject(this.signer, this.customers, input.businessId, input.token, now);
    if (!subject.ok) return subject;
    const { userId, customer } = subject.value;

    const program = await this.programs.get(input.businessId);
    const outcome = await this.cards.transact(input.businessId, userId, (current) =>
      (current ?? StampCard.empty(input.businessId, userId, now)).stamp(program, input.staffUserId, now)
    );
    if (!outcome.ok) return outcome;

    const { card, stamp, rewardUnlocked } = outcome.value;
    // The timeline is a convenience copy: a failure here must never undo the stamp.
    await this.activity
      .record({
        businessId: input.businessId,
        userId,
        type: "stamp_added",
        eventId: stamp.id,
        data: { stamps: card.displayStamps(program), required: program.requiredStamps, sequence: stamp.sequence, staffId: input.staffUserId },
      })
      .catch(() => undefined);
    if (rewardUnlocked) {
      await this.activity
        .record({
          businessId: input.businessId,
          userId,
          type: "reward_unlocked",
          eventId: `unlocked-${stamp.id}`,
          data: { reward: program.rewardName },
        })
        .catch(() => undefined);
    }

    return ok({
      firstName: customer.firstName,
      card: toStampCardDto(card, program, input.businessId, userId, now),
      rewardUnlocked,
    });
  }
}
