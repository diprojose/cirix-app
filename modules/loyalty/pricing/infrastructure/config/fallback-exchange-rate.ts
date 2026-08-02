import { ExchangeRate } from "../../domain/value-objects/exchange-rate";
import type { ExchangeRateProvider } from "../../domain/ports/exchange-rate-provider";

/**
 * Manually maintained USD→VES rate used when the live BCV feed is unreachable.
 * Update `FALLBACK_VES_PER_USD` (and its date) whenever the published rate
 * drifts — an operator screen will own this value in a later phase. It can also
 * be overridden without a deploy via the `EXCHANGE_RATE_FALLBACK_VES` env var.
 */
const FALLBACK_VES_PER_USD = 727.45;
const FALLBACK_AS_OF = "2026-07-16";

/**
 * FallbackExchangeRateProvider adapts the manual rate above to the
 * {@link ExchangeRateProvider} port so the storefront always has a rate to
 * show, even with the live feed down.
 */
export class FallbackExchangeRateProvider implements ExchangeRateProvider {
  async getUsdRate(): Promise<ExchangeRate | null> {
    const override = Number.parseFloat(process.env.EXCHANGE_RATE_FALLBACK_VES ?? "");
    const vesPerUsd = Number.isFinite(override) && override > 0 ? override : FALLBACK_VES_PER_USD;

    const result = ExchangeRate.create(vesPerUsd, "fallback", FALLBACK_AS_OF);
    return result.ok ? result.value : null;
  }
}
