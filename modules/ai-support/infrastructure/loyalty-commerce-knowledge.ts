import "server-only";
import { makeListAvailableProducts } from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import { makeListDeliveryZones } from "@/modules/loyalty/ordering/infrastructure/di/ordering-container";
import { PAYMENT_METHODS } from "@/modules/loyalty/ordering/domain/value-objects/payment-method";
import { makeGetRewardRules } from "@/modules/loyalty/rewards/infrastructure/di/rewards-container";
import { DEFAULT_REFERRAL_CONFIG } from "@/modules/loyalty/referrals/infrastructure/config/referral-config";
import type {
  FulfillmentOptions,
  LoyaltyProgram,
  PublicCommerceKnowledge,
  PublicProduct,
} from "../application/public-commerce-knowledge";
import { toPublicProduct } from "../application/public-commerce-knowledge";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export class LoyaltyCommerceKnowledge implements PublicCommerceKnowledge {
  async searchProducts(query?: string): Promise<PublicProduct[]> {
    const result = await makeListAvailableProducts().execute();
    if (!result.ok) return [];

    const normalizedQuery = normalize(query ?? "");
    const namedMatches = result.value.filter((product) =>
      normalizedQuery.includes(normalize(product.name))
    );
    const selected = namedMatches.length > 0 ? namedMatches : result.value;

    return selected.slice(0, 6).map(toPublicProduct);
  }

  async getFulfillmentOptions(): Promise<FulfillmentOptions> {
    const result = await makeListDeliveryZones().execute();
    return {
      pickupAvailable: true,
      deliveryZones: result.ok
        ? result.value.map((zone) => ({
            name: zone.name,
            feeCents: zone.feeCents,
            currency: "USD",
          }))
        : [],
      paymentMethods: [...PAYMENT_METHODS],
    };
  }

  async getLoyaltyProgram(): Promise<LoyaltyProgram> {
    const result = await makeGetRewardRules().execute();
    const rules = result.ok
      ? result.value
      : { holdbackDays: 7, expiryDays: 90, maxRedeemPctOfOrder: 30 };
    return {
      holdbackDays: rules.holdbackDays,
      expiryDays: rules.expiryDays,
      maxRedeemPctOfOrder: rules.maxRedeemPctOfOrder,
      referralRewardCents: DEFAULT_REFERRAL_CONFIG.referrerRewardCents,
      referralMonthlyCap: DEFAULT_REFERRAL_CONFIG.maxRewardedPerMonth,
      currency: "USD",
    };
  }
}
