import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { toRewardRulesDto, type RewardRulesDto } from "../dtos/reward-rules-dto";

/**
 * Returns the current reward configuration (earn rate, holdback, expiry, redeem
 * cap) for the admin panel and any UI that previews earnings. The store always
 * yields valid rules — falling back to defaults when none are stored — so this
 * never fails for business reasons.
 */
export class GetRewardRules implements UseCase<void, RewardRulesDto> {
  constructor(private readonly rulesStore: RewardRulesStore) {}

  async execute(): Promise<Result<RewardRulesDto, DomainError>> {
    const rules = await this.rulesStore.read();
    return ok(toRewardRulesDto(rules));
  }
}
