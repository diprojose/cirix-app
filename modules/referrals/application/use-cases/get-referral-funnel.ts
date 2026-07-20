import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferralState } from "../../domain/value-objects/referral-state";

/** How many referrals sit at each stage of the funnel, plus the total. */
export type ReferralFunnelDto = {
  counts: Record<ReferralState, number>;
  total: number;
};

const SCAN_LIMIT = 5000;

/**
 * Counts referrals by stage for the KPIs dashboard (US-I1): how many signed up,
 * made a first purchase, and unlocked a reward — the referral payback funnel.
 */
export class GetReferralFunnel implements UseCase<void, ReferralFunnelDto> {
  constructor(private readonly referrals: ReferralRepository) {}

  async execute(): Promise<Result<ReferralFunnelDto, DomainError>> {
    const all = await this.referrals.findAll(SCAN_LIMIT);
    const counts: Record<ReferralState, number> = {
      registrado: 0,
      primera_compra: 0,
      recompensa_pendiente: 0,
      bloqueado: 0,
    };
    for (const referral of all) {
      counts[referral.state] += 1;
    }
    return ok({ counts, total: all.length });
  }
}
