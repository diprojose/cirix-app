import type { Locale } from "@/lib/locale";

export type PublicProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  department: string;
};

type ProductSource = PublicProduct & { costCents?: number; featured?: boolean; available?: boolean; imageUrl?: string };

/** Allow-list mapping: internal catalog fields cannot accidentally reach the model. */
export function toPublicProduct(product: ProductSource): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    currency: product.currency,
    department: product.department,
  };
}

export type FulfillmentOptions = {
  pickupAvailable: boolean;
  deliveryZones: Array<{ name: string; feeCents: number; currency: string }>;
  paymentMethods: string[];
};

export type LoyaltyProgram = {
  holdbackDays: number;
  expiryDays: number;
  maxRedeemPctOfOrder: number;
  referralRewardCents: number;
  referralMonthlyCap: number;
  currency: string;
};

/** Public, deliberately narrow view of commerce data available to support. */
export interface PublicCommerceKnowledge {
  searchProducts(query?: string): Promise<PublicProduct[]>;
  getFulfillmentOptions(): Promise<FulfillmentOptions>;
  getLoyaltyProgram(): Promise<LoyaltyProgram>;
}

export type SupportMode = "simulated" | "ai";

export type SupportRequest = {
  locale: Locale;
  text: string;
};
