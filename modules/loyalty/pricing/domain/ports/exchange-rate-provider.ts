import type { ExchangeRate } from "../value-objects/exchange-rate";

/**
 * ExchangeRateProvider is the outbound port for obtaining the current official
 * USD→VES rate. Adapters may back it with a remote API, a cache or a manually
 * maintained constant. Returning `null` means "this source has no rate right
 * now" — callers decide whether to fall back to another provider.
 */
export interface ExchangeRateProvider {
  getUsdRate(): Promise<ExchangeRate | null>;
}
