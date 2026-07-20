/**
 * Formats an integer amount of minor units (cents) plus an ISO-4217 currency
 * code into a localized currency string. Kept at the UI edge so DTOs stay
 * currency-agnostic. Example: `formatPrice(2500, "USD") → "$25.00"`.
 *
 * The locale is `es-US` rather than plain `es`: the market is Florida, so
 * amounts follow US conventions ("$4.00") while the interface stays in Spanish.
 * Plain `es` renders USD as "4,00 US$", which is both wrong for the market and
 * nearly twice as wide, which matters in a three-column catalog cell.
 */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Converts a USD amount in cents to bolívares at the given rate and formats it
 * the way Venezuelan commerce writes it ("Bs 26.186,25"). Formatted manually
 * rather than via the VES currency code because CLDR data for VES is
 * inconsistent across runtimes.
 */
export function formatVes(usdCents: number, vesPerUsd: number): string {
  return formatVesAmount(usdCents, vesPerUsd, 2);
}

/**
 * Like {@link formatVes} but without decimals — for tight spots (catalog cards)
 * where "Bs 18.186" reads better than "Bs 18.186,25".
 */
export function formatVesCompact(usdCents: number, vesPerUsd: number): string {
  return formatVesAmount(usdCents, vesPerUsd, 0);
}

function formatVesAmount(usdCents: number, vesPerUsd: number, decimals: number): string {
  const bolivares = (usdCents / 100) * vesPerUsd;
  const formatted = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(bolivares);
  return `Bs ${formatted}`;
}
