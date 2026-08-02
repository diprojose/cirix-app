import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { RetentionConfig } from "../retention-config";

/** How many profiles changed segment this run. */
export type RecalculateSegmentsSummary = { updatedCount: number };

/** Upper bound on profiles processed per run. */
const BATCH_LIMIT = 2000;

/**
 * Recomputes every customer's RFM segment from their current recency (BR-21):
 * the periodic job that demotes customers who have gone quiet — a VIP who stops
 * ordering slides to `en_riesgo` then `inactivo` — even though no new order
 * triggered it. Only profiles whose segment actually changed are written.
 */
export class RecalculateSegments implements UseCase<void, RecalculateSegmentsSummary> {
  constructor(
    private readonly profiles: CustomerProfileRepository,
    private readonly config: RetentionConfig
  ) {}

  async execute(): Promise<Result<RecalculateSegmentsSummary, DomainError>> {
    const nowIso = new Date().toISOString();
    const all = await this.profiles.findAll(BATCH_LIMIT);

    let updatedCount = 0;
    for (const profile of all) {
      const recalculated = profile.withRecalculatedSegment(nowIso, this.config.rfm);
      if (recalculated.segment !== profile.segment) {
        await this.profiles.save(recalculated);
        updatedCount += 1;
      }
    }

    return ok({ updatedCount });
  }
}
