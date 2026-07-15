/**
 * Formats an integer amount of minor units (cents) plus an ISO-4217 currency
 * code into a localized currency string (Spanish locale). Kept at the UI edge so
 * DTOs stay currency-agnostic. Example: `formatPrice(2500, "USD") → "$25,00"`.
 */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
