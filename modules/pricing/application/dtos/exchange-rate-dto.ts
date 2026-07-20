import type { ExchangeRate, ExchangeRateSource } from "../../domain/value-objects/exchange-rate";

/**
 * ExchangeRateDto is the plain, serializable view of an {@link ExchangeRate}
 * exposed by use cases, safe to cross the RSC server→client boundary (e.g. the
 * cart needs the rate on the client to show bolívar totals).
 */
export type ExchangeRateDto = {
  vesPerUsd: number;
  source: ExchangeRateSource;
  asOf: string;
};

/** Maps an ExchangeRate value object to its serializable DTO. */
export const toExchangeRateDto = (rate: ExchangeRate): ExchangeRateDto => ({
  vesPerUsd: rate.vesPerUsd,
  source: rate.source,
  asOf: rate.asOf,
});
