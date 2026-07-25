import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { AuditTrail } from "@/shared/application/audit-trail";
import type { FraudAlertRepository } from "../../domain/repositories/fraud-alert-repository";
import type { ReferralModerator } from "../../domain/ports/referral-moderator";
import { FraudAlertId } from "../../domain/value-objects/fraud-alert-id";
import { FraudAlertNotFoundError } from "../../domain/errors/fraud-errors";
import { toFraudAlertDto, type FraudAlertDto } from "../dtos/fraud-alert-dto";

/** Input for {@link ResolveFraudAlert}: the alert, the verdict and who decided. */
export type ResolveFraudAlertInput = {
  alertId: string;
  verdict: "approve" | "block";
  operatorId: string;
};

/**
 * Resolves a fraud alert (UC-24): clears it (`approve`) or confirms it (`block`).
 * Blocking a referral alert drives the referrals context to block the referral
 * and reverse the referrer's reward. Either way the decision is written to the
 * immutable audit trail (BR-19), so who resolved what, and how, is on record.
 */
export class ResolveFraudAlert implements UseCase<ResolveFraudAlertInput, FraudAlertDto> {
  constructor(
    private readonly alerts: FraudAlertRepository,
    private readonly moderator: ReferralModerator,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: ResolveFraudAlertInput): Promise<Result<FraudAlertDto, DomainError>> {
    const alert = await this.alerts.findById(FraudAlertId.from(input.alertId));
    if (alert === null) {
      return err(new FraudAlertNotFoundError(input.alertId));
    }

    const resolved = alert.resolve(input.verdict, input.operatorId);
    if (!resolved.ok) {
      return resolved;
    }
    await this.alerts.save(resolved.value);

    if (input.verdict === "block" && resolved.value.subjectType === "referral") {
      await this.moderator.block(resolved.value.subjectId);
    }

    await this.audit.record({
      actorId: input.operatorId,
      action: "fraud.alert_resolved",
      before: { alertId: input.alertId, status: "pending" },
      after: {
        alertId: input.alertId,
        verdict: input.verdict,
        subjectType: resolved.value.subjectType,
        subjectId: resolved.value.subjectId,
      },
    });

    return ok(toFraudAlertDto(resolved.value));
  }
}
