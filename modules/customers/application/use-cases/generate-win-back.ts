import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { PromotionalCreditGranter } from "../../domain/ports/promotional-credit-granter";
import type { RetentionConfig } from "../retention-config";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How many win-back incentives this run sent. */
export type GenerateWinBackSummary = { sentCount: number };

/** Upper bound on profiles processed per run. */
const BATCH_LIMIT = 2000;

/**
 * Sends a win-back incentive to customers who have gone quiet (BR-17): those
 * inactive beyond the threshold get a short-lived credit — but only once per
 * inactivity window, so a customer is not pestered every time the job runs. The
 * grant is keyed by customer and window, making repeated runs idempotent.
 */
export class GenerateWinBack implements UseCase<void, GenerateWinBackSummary> {
  constructor(
    private readonly profiles: CustomerProfileRepository,
    private readonly granter: PromotionalCreditGranter,
    private readonly config: RetentionConfig
  ) {}

  async execute(): Promise<Result<GenerateWinBackSummary, DomainError>> {
    const nowIso = new Date().toISOString();
    const windowMs = this.config.winBack.windowDays * MS_PER_DAY;
    const windowIndex = Math.floor(Date.parse(nowIso) / windowMs);
    const all = await this.profiles.findAll(BATCH_LIMIT);

    let sentCount = 0;
    for (const profile of all) {
      if (profile.recencyDays(nowIso) <= this.config.winBack.inactiveDays) {
        continue;
      }
      if (!this.windowElapsed(profile.winBackSentAt, nowIso)) {
        continue;
      }

      await this.granter.grant({
        entryId: `winback_${profile.uid}_${windowIndex}`,
        customerUid: profile.uid,
        amountCents: this.config.winBack.bonusCents,
        note: "Te extrañamos",
        expiryDays: this.config.winBack.bonusExpiryDays,
      });
      await this.profiles.save(profile.markWinBackSent(nowIso));
      sentCount += 1;
    }

    return ok({ sentCount });
  }

  /** Whether enough time has passed since the last win-back to send another. */
  private windowElapsed(lastSentIso: string | null, nowIso: string): boolean {
    if (lastSentIso === null) {
      return true;
    }
    const elapsedDays = (Date.parse(nowIso) - Date.parse(lastSentIso)) / MS_PER_DAY;
    return elapsedDays >= this.config.winBack.windowDays;
  }
}
