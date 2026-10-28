import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { tableCodeMatches, type TableCodeRepository } from "../../domain/ports/table-code-repository";
import { StampCard } from "../../domain/entities/stamp-card";
import { InvalidTableCodeError, NotACustomerError, TableStampsDisabledError } from "../../domain/errors/stamp-card-errors";
import { toStampCardDto, type StampCardDto } from "../dtos/stamp-card-dto";

export type ClaimTableStampInput = {
  businessId: string;
  /** The customer, from the verified session: a person can only stamp their own card. */
  userId: string;
  /** The code inside the table QR they scanned. */
  code: string;
};

export type ClaimTableStampOutput = { card: StampCardDto; rewardUnlocked: boolean };

/**
 * A customer stamps their own card by scanning the QR printed on the table. It
 * only works when the owner turned it on and the code is the current one, and
 * the same atomic cooldown as a staff stamp applies, so one visit earns one
 * stamp however many times the QR is scanned.
 *
 * The printed code cannot prove the person is in the restaurant: a photo of it
 * works anywhere. The longer minimum wait, replacing the code, and recording
 * these stamps apart from staff stamps are what keep that risk bounded.
 */
export class ClaimTableStamp implements UseCase<ClaimTableStampInput, ClaimTableStampOutput> {
  constructor(
    private readonly codes: TableCodeRepository,
    private readonly customers: CustomerDirectory,
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly activity: CustomerActivityLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: ClaimTableStampInput): Promise<Result<ClaimTableStampOutput, DomainError>> {
    const now = this.now();
    const program = await this.programs.get(input.businessId);
    if (!program.tableStamps) return err(new TableStampsDisabledError());

    const current = await this.codes.current(input.businessId);
    if (!tableCodeMatches(current.code, input.code)) return err(new InvalidTableCodeError());

    if ((await this.customers.find(input.businessId, input.userId)) === null) return err(new NotACustomerError());

    const outcome = await this.cards.transact(input.businessId, input.userId, (card) =>
      (card ?? StampCard.empty(input.businessId, input.userId, now)).stamp(program, null, now)
    );
    if (!outcome.ok) return outcome;

    const { card, stamp, rewardUnlocked } = outcome.value;
    // The timeline is a convenience copy: a failure here must never undo the stamp.
    await this.activity
      .record({
        businessId: input.businessId,
        userId: input.userId,
        type: "stamp_added",
        eventId: stamp.id,
        data: { stamps: card.displayStamps(program), required: program.requiredStamps, sequence: stamp.sequence, source: "table_qr" },
      })
      .catch(() => undefined);
    if (rewardUnlocked) {
      await this.activity
        .record({
          businessId: input.businessId,
          userId: input.userId,
          type: "reward_unlocked",
          eventId: `unlocked-${stamp.id}`,
          data: { reward: program.rewardName },
        })
        .catch(() => undefined);
    }

    return ok({ card: toStampCardDto(card, program, input.businessId, input.userId, now), rewardUnlocked });
  }
}
