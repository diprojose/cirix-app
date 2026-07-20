import type { ExchangeRate } from "../value-objects/exchange-rate";
import type { ExchangeRateProvider } from "./exchange-rate-provider";

/**
 * ManualExchangeRateStore is the outbound port for the operator-maintained
 * rate: readable as any other {@link ExchangeRateProvider} (it sits in the
 * fallback chain) and writable from the admin panel when the live feed is
 * down or wrong.
 */
export interface ManualExchangeRateStore extends ExchangeRateProvider {
  /** Persists the operator's rate, replacing any previous one. */
  save(rate: ExchangeRate): Promise<void>;
}
