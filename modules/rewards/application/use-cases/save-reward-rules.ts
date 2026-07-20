import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { AuditTrail } from "@/shared/application/audit-trail";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { RewardRules } from "../../domain/value-objects/reward-rules";
import { toRewardRulesDto, type RewardRulesDto } from "../dtos/reward-rules-dto";

/** Input for {@link SaveRewardRules}: the operator and the new configuration. */
export type SaveRewardRulesInput = {
  operatorId: string;
  earnRatePctOfMargin: number;
  holdbackDays: number;
  expiryDays: number;
  maxRedeemPctOfOrder: number;
};

/**
 * Saves a new reward configuration (US-G1, US-F5, UC-25). The values are
 * validated as a whole {@link RewardRules} value object, the change is recorded
 * with its before/after in the audit trail (BR-19), and it applies only to
 * future transactions — nothing already in the ledger is rewritten (BR-18).
 */
export class SaveRewardRules implements UseCase<SaveRewardRulesInput, RewardRulesDto> {
  constructor(
    private readonly rulesStore: RewardRulesStore,
    private readonly audit: AuditTrail
  ) {}

  async execute(
    input: SaveRewardRulesInput
  ): Promise<Result<RewardRulesDto, DomainError>> {
    const rules = RewardRules.create({
      earnRatePctOfMargin: input.earnRatePctOfMargin,
      holdbackDays: input.holdbackDays,
      expiryDays: input.expiryDays,
      maxRedeemPctOfOrder: input.maxRedeemPctOfOrder,
    });
    if (!rules.ok) {
      return rules;
    }

    const previous = await this.rulesStore.read();
    await this.rulesStore.write(rules.value);
    await this.audit.record({
      actorId: input.operatorId,
      action: "rewards.rules_updated",
      before: toRewardRulesDto(previous),
      after: toRewardRulesDto(rules.value),
    });

    return ok(toRewardRulesDto(rules.value));
  }
}
