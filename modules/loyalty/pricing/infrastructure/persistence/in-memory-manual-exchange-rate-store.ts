import type { ExchangeRate } from "../../domain/value-objects/exchange-rate";
import type { ManualExchangeRateStore } from "../../domain/ports/manual-exchange-rate-store";

/** Process-local manual rate slot for development without Firebase. */
export class InMemoryManualExchangeRateStore implements ManualExchangeRateStore {
  async getUsdRate(): Promise<ExchangeRate | null> {
    const runtime = globalThis as typeof globalThis & {
      __mixmagDemoManualRate?: ExchangeRate;
    };
    return runtime.__mixmagDemoManualRate ?? null;
  }

  async save(rate: ExchangeRate): Promise<void> {
    const runtime = globalThis as typeof globalThis & {
      __mixmagDemoManualRate?: ExchangeRate;
    };
    runtime.__mixmagDemoManualRate = rate;
  }
}
