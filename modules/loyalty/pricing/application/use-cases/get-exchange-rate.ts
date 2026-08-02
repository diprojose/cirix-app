import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ExchangeRateProvider } from "../../domain/ports/exchange-rate-provider";
import { ExchangeRateUnavailableError } from "../../domain/errors/pricing-errors";
import { toExchangeRateDto, type ExchangeRateDto } from "../dtos/exchange-rate-dto";

/**
 * Returns the current official USD→VES rate by walking a provider chain in
 * priority order — live BCV feed first, then the operator's manual rate, then
 * the static fallback baked into the deploy (rate APIs fail often enough in
 * Venezuela that the storefront must never depend on one source). Only when
 * every source is empty does it fail — callers should treat that as "hide
 * bolívar prices", never as a hard page error.
 */
export class GetExchangeRate implements UseCase<void, ExchangeRateDto> {
  constructor(private readonly providers: ExchangeRateProvider[]) {}

  async execute(): Promise<Result<ExchangeRateDto, DomainError>> {
    for (const provider of this.providers) {
      const rate = await provider.getUsdRate().catch(() => null);
      if (rate) {
        return ok(toExchangeRateDto(rate));
      }
    }
    return err(new ExchangeRateUnavailableError());
  }
}
