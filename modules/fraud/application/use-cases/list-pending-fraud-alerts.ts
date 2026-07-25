import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { FraudAlertRepository } from "../../domain/repositories/fraud-alert-repository";
import { toFraudAlertDto, type FraudAlertDto } from "../dtos/fraud-alert-dto";

/**
 * Lists the fraud alerts awaiting review for the analyst's panel (US-F4). Returns
 * plain DTOs so the admin page renders without touching domain types.
 */
export class ListPendingFraudAlerts implements UseCase<void, FraudAlertDto[]> {
  constructor(private readonly alerts: FraudAlertRepository) {}

  async execute(): Promise<Result<FraudAlertDto[], DomainError>> {
    const pending = await this.alerts.findPending();
    return ok(pending.map(toFraudAlertDto));
  }
}
