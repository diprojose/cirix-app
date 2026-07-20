import { ExchangeRate } from "../../domain/value-objects/exchange-rate";
import type { ExchangeRateProvider } from "../../domain/ports/exchange-rate-provider";

/** Shape of one entry returned by the api-monitor-bcv `/exchange-rate/main` endpoint. */
type BcvMonitorRate = {
  code: string;
  country: string;
  buy: number | string;
  sell: number | string;
  date: string;
  percentageChange?: string;
};

/** Default production deployment of the companion api-monitor-bcv service. */
const DEFAULT_BASE_URL = "https://api-monitor-bcv.vercel.app";

/** How long a fetched rate stays fresh. BCV publishes once per banking day. */
const REVALIDATE_SECONDS = 3600;

/**
 * BcvMonitorExchangeRateProvider adapts the companion `api-monitor-bcv` service
 * (which scrapes the official BCV publication) to the {@link ExchangeRateProvider}
 * port. Responses are cached by the Next.js fetch cache for an hour, so the
 * storefront hits the remote API at most once per hour per server instance.
 * Any network, shape or validation failure yields `null` — the caller falls
 * back to the manual rate instead of breaking the page.
 */
export class BcvMonitorExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly baseUrl: string = process.env.BCV_API_URL ?? DEFAULT_BASE_URL
  ) {}

  async getUsdRate(): Promise<ExchangeRate | null> {
    try {
      const response = await fetch(`${this.baseUrl}/exchange-rate/main`, {
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (!response.ok) {
        return null;
      }

      const rates = (await response.json()) as BcvMonitorRate[];
      const usd = rates.find((rate) => rate.code === "USD");
      if (!usd) {
        return null;
      }

      const vesPerUsd = parseRateNumber(usd.sell);
      const asOf = toIsoDate(usd.date);
      if (vesPerUsd === null || asOf === null) {
        return null;
      }

      const result = ExchangeRate.create(vesPerUsd, "bcv", asOf);
      return result.ok ? result.value : null;
    } catch {
      return null;
    }
  }
}

/** Parses a rate that may arrive as a number or a comma-decimal string. */
function parseRateNumber(value: number | string): number | null {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Converts the API's DD/MM/YYYY publication date into an ISO YYYY-MM-DD date. */
function toIsoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}
