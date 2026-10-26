/**
 * The kind of business decides which loyalty experience it gets: a supermarket
 * earns points per purchase, a restaurant collects stamps per visit. `other`
 * covers businesses that only use the shared CRM.
 */
export const BUSINESS_KINDS = ["supermarket", "restaurant", "other"] as const;

export type BusinessKind = (typeof BUSINESS_KINDS)[number];

/** Type guard narrowing arbitrary text to a known {@link BusinessKind}. */
export const isBusinessKind = (value: string): value is BusinessKind =>
  (BUSINESS_KINDS as readonly string[]).includes(value);

/** Lifecycle of a business: suspended businesses stay stored but cannot be used. */
export const BUSINESS_STATUSES = ["active", "suspended"] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const isBusinessStatus = (value: string): value is BusinessStatus =>
  (BUSINESS_STATUSES as readonly string[]).includes(value);
