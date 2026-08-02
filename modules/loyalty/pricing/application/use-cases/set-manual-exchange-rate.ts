import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ManualExchangeRateStore } from "../../domain/ports/manual-exchange-rate-store";
import { ExchangeRate } from "../../domain/value-objects/exchange-rate";
import { toExchangeRateDto, type ExchangeRateDto } from "../dtos/exchange-rate-dto";

/** Input for {@link SetManualExchangeRate}: bolívares per one US dollar. */
export type SetManualExchangeRateInput = {
  vesPerUsd: number;
};

/**
 * Records the operator's manual USD→VES rate (admin action), used by the
 * provider chain when the live BCV feed is down. Dated today — a manual rate
 * is always "the rate the operator asserts right now".
 */
export class SetManualExchangeRate
  implements UseCase<SetManualExchangeRateInput, ExchangeRateDto>
{
  constructor(private readonly store: ManualExchangeRateStore) {}

  async execute(
    input: SetManualExchangeRateInput
  ): Promise<Result<ExchangeRateDto, DomainError>> {
    const today = new Date().toISOString().slice(0, 10);
    const rate = ExchangeRate.create(input.vesPerUsd, "manual", today);
    if (!rate.ok) {
      return rate;
    }

    await this.store.save(rate.value);
    return ok(toExchangeRateDto(rate.value));
  }
}
