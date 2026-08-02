import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { FraudAlertRepository } from "../../domain/repositories/fraud-alert-repository";
import { FraudAlert } from "../../domain/entities/fraud-alert";
import { toFraudAlertDto, type FraudAlertDto } from "../dtos/fraud-alert-dto";

/** Input for {@link RaiseFraudAlert}: the subject and the evidence. */
export type RaiseFraudAlertInput = {
  subjectType: string;
  subjectId: string;
  signal: string;
  evidence: string;
};

/**
 * Raises a fraud alert for review (BR-09). In this phase alerts are raised
 * manually by an operator; the aggregate validates the flag, and the panel picks
 * it up as pending. Automated device/payment/address signals arrive later, when
 * the app collects the data to compute them.
 */
export class RaiseFraudAlert implements UseCase<RaiseFraudAlertInput, FraudAlertDto> {
  constructor(private readonly alerts: FraudAlertRepository) {}

  async execute(input: RaiseFraudAlertInput): Promise<Result<FraudAlertDto, DomainError>> {
    const alert = FraudAlert.raise(input);
    if (!alert.ok) {
      return alert;
    }
    await this.alerts.save(alert.value);
    return ok(toFraudAlertDto(alert.value));
  }
}
