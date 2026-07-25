import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { RfmSegment } from "../../domain/value-objects/rfm-segment";

/** How many customers fall in each segment, plus the total. */
export type SegmentDistributionDto = {
  counts: Record<RfmSegment, number>;
  total: number;
};

const SCAN_LIMIT = 5000;

/**
 * Counts customers by RFM segment for the KPIs dashboard (US-I1). A single
 * bounded scan of the small profile store — the base for deciding where to aim
 * offers and win-back budget.
 */
export class GetSegmentDistribution implements UseCase<void, SegmentDistributionDto> {
  constructor(private readonly profiles: CustomerProfileRepository) {}

  async execute(): Promise<Result<SegmentDistributionDto, DomainError>> {
    const all = await this.profiles.findAll(SCAN_LIMIT);
    const counts: Record<RfmSegment, number> = {
      nuevo: 0,
      activo: 0,
      vip: 0,
      en_riesgo: 0,
      inactivo: 0,
    };
    for (const profile of all) {
      counts[profile.segment] += 1;
    }
    return ok({ counts, total: all.length });
  }
}
