import { describe, expect, it } from "vitest";
import { getSupportMode } from "@/modules/ai-support/application/support-mode";
import { answerSimulatedSupport } from "@/modules/ai-support/application/simulated-support";
import {
  toPublicProduct,
  type PublicCommerceKnowledge,
} from "@/modules/ai-support/application/public-commerce-knowledge";

const knowledge: PublicCommerceKnowledge = {
  async searchProducts() {
    return [{
      id: "p1",
      name: "Tomates",
      description: "Frescos",
      priceCents: 300,
      currency: "USD",
      department: "supermercado",
    }];
  },
  async getFulfillmentOptions() {
    return {
      pickupAvailable: true,
      deliveryZones: [{ name: "Centro", feeCents: 200, currency: "USD" }],
      paymentMethods: ["pago_movil", "efectivo"],
    };
  },
  async getLoyaltyProgram() {
    return {
      holdbackDays: 7,
      expiryDays: 90,
      maxRedeemPctOfOrder: 30,
      referralRewardCents: 200,
      referralMonthlyCap: 10,
      currency: "USD",
    };
  },
};

describe("AI support feature gate", () => {
  it("defaults every value except exact true to simulated mode", () => {
    expect(getSupportMode({})).toBe("simulated");
    expect(getSupportMode({ AI_SUPPORT_ENABLED: "false" })).toBe("simulated");
    expect(getSupportMode({ AI_SUPPORT_ENABLED: "TRUE" })).toBe("simulated");
    expect(getSupportMode({ AI_SUPPORT_ENABLED: "true" })).toBe("ai");
  });
});

describe("public commerce boundary", () => {
  it("allow-lists product fields and drops internal cost data", () => {
    const result = toPublicProduct({
      id: "p1",
      name: "Tomates",
      description: "Frescos",
      priceCents: 300,
      costCents: 180,
      currency: "USD",
      department: "supermercado",
      featured: true,
      available: true,
      imageUrl: "/secret.png",
    });
    expect(result).toEqual({
      id: "p1",
      name: "Tomates",
      description: "Frescos",
      priceCents: 300,
      currency: "USD",
      department: "supermercado",
    });
    expect(result).not.toHaveProperty("costCents");
  });
});

describe("simulated support", () => {
  it("answers public topics without a model", async () => {
    await expect(answerSimulatedSupport({ locale: "es", text: "precio de tomates" }, knowledge))
      .resolves.toContain("Tomates");
    await expect(answerSimulatedSupport({ locale: "en", text: "How much is delivery?" }, knowledge))
      .resolves.toContain("Centro");
  });

  it("answers contact and business questions without a model", async () => {
    await expect(answerSimulatedSupport({ locale: "es", text: "Como puedo contactarlos?" }, knowledge))
      .resolves.toContain("formulario publico");
    await expect(answerSimulatedSupport({ locale: "es", text: "Que hacen?" }, knowledge))
      .resolves.toContain("Cirix");
    await expect(answerSimulatedSupport({ locale: "en", text: "What do you sell?" }, knowledge))
      .resolves.toContain("Tomates");
  });

  it("refuses personal data and discloses simulated mode for unknown topics", async () => {
    await expect(answerSimulatedSupport({ locale: "es", text: "cual es mi saldo" }, knowledge))
      .resolves.toContain("no consulta");
    await expect(answerSimulatedSupport({ locale: "en", text: "tell me a joke" }, knowledge))
      .resolves.toContain("simulated mode");
  });
});
