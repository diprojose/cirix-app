import { afterAll, describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";

/*
 * Integration test against a REAL Firestore (opt-in). It proves what the in-memory
 * fake cannot: that the balance and the code change in one transaction, so points
 * cannot be spent twice or returned twice when requests arrive at the same moment.
 *
 *   FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-rewards.integration.test.ts
 */
vi.mock("server-only", () => ({}));

if (process.env.FIRESTORE_INTEGRATION === "1") {
  const env = process.env as Record<string, string | undefined>;
  const mode = env.NODE_ENV;
  env.NODE_ENV = "development";
  nextEnv.loadEnvConfig(process.cwd(), true);
  env.NODE_ENV = mode;
}

import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { PointsAccount } from "@/modules/receipts/domain/entities/points-account";
import {
  CancelRedemption,
  DeliverRedemption,
  ListMyRedemptions,
  ListRecentRedemptions,
  ListRewards,
  RedeemPoints,
  SaveReward,
} from "@/modules/receipts/application/use-cases/reward-use-cases";
import { REDEMPTION_DAYS } from "@/modules/receipts/domain/entities/redemption";
import {
  FirestorePointsRepository,
  FirestoreRedemptionRepository,
  FirestoreRewardCatalog,
} from "@/modules/receipts/infrastructure/persistence/firestore-receipt-repositories";

const enabled = process.env.FIRESTORE_INTEGRATION === "1";
const businessId = `itest-rewards-${Date.now().toString(36)}`;
const NOW = new Date("2026-11-06T12:00:00.000Z");
const customers = { exists: async () => true };
const names = { firstName: async () => "Ana" };
const activity = { rewardRedeemed: async () => undefined };

describe.skipIf(!enabled)("rewards on a real Firestore", { timeout: 90_000 }, () => {
  const points = () => new FirestorePointsRepository(adminFirestore());
  const catalog = () => new FirestoreRewardCatalog(adminFirestore());
  const redemptions = () => new FirestoreRedemptionRepository(adminFirestore());
  const clock = () => NOW;

  const give = (userId: string, amount: number) =>
    points().transact(businessId, userId, (current) => (current ?? PointsAccount.empty(businessId, userId, NOW)).earn(amount, `seed-${amount}`, 100, NOW));
  const reward = async (cost: number) => {
    const saved = await new SaveReward(catalog(), clock).execute({ businessId, rewardId: null, name: "Café gratis", description: "", points: cost, active: true });
    if (!saved.ok) throw saved.error;
    return saved.value.id;
  };
  const redeem = (userId: string, rewardId: string) => new RedeemPoints(catalog(), customers, redemptions(), clock).execute({ businessId, userId, rewardId });
  const balance = async (userId: string) => (await points().find(businessId, userId))?.balance ?? 0;

  afterAll(async () => {
    await adminFirestore().recursiveDelete(adminFirestore().collection("businesses").doc(businessId));
  });

  it("stores and lists the catalog, cheapest first", async () => {
    await reward(300);
    await reward(100);
    const listed = await new ListRewards(catalog()).execute({ businessId, activeOnly: true });
    expect(listed.ok && listed.value.map((item) => item.points).slice(0, 2)).toEqual([100, 300]);
  });

  it("lets only as many simultaneous redemptions win as the balance pays for", async () => {
    await give("rosa", 250);
    const rewardId = await reward(100);
    const results = await Promise.all(Array.from({ length: 6 }, () => redeem("rosa", rewardId)));
    expect(results.filter((result) => result.ok)).toHaveLength(2);
    expect(await balance("rosa")).toBe(50);
    const stored = await redemptions().listForCustomer(businessId, "rosa");
    expect(stored).toHaveLength(2);
    expect((await points().entries(businessId, "rosa", 20)).filter((entry) => entry.reason === "redemption")).toHaveLength(2);
  });

  it("delivers a code once when several cashiers scan it at the same moment", async () => {
    await give("ana", 100);
    const opened = await redeem("ana", await reward(100));
    if (!opened.ok) throw opened.error;
    const deliver = new DeliverRedemption(redemptions(), names, activity, clock);
    const results = await Promise.all(Array.from({ length: 5 }, () => deliver.execute({ businessId, code: opened.value.code, staffUserId: "cajero" })));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await balance("ana")).toBe(0);
  });

  it("returns points once when a cancel and a delivery race, never both outcomes", async () => {
    await give("luis", 100);
    const opened = await redeem("luis", await reward(100));
    if (!opened.ok) throw opened.error;
    const [delivered, cancelled] = await Promise.all([
      new DeliverRedemption(redemptions(), names, activity, clock).execute({ businessId, code: opened.value.code, staffUserId: "cajero" }),
      new CancelRedemption(redemptions(), clock).execute({ businessId, userId: "luis", code: opened.value.code }),
    ]);
    expect([delivered.ok, cancelled.ok].filter(Boolean)).toHaveLength(1);
    expect(await balance("luis")).toBe(cancelled.ok ? 100 : 0);
  });

  it("refunds an expired code once when several tabs open the list together", async () => {
    await give("eva", 100);
    const opened = await redeem("eva", await reward(100));
    if (!opened.ok) throw opened.error;
    const later = () => new Date(NOW.getTime() + REDEMPTION_DAYS * 86_400_000);
    const list = new ListMyRedemptions(redemptions(), later);
    await Promise.all(Array.from({ length: 4 }, () => list.execute({ businessId, userId: "eva" })));
    expect(await balance("eva")).toBe(100);
    expect((await redemptions().find(businessId, opened.value.code))?.status).toBe("expired");
    const refunds = (await points().entries(businessId, "eva", 20)).filter((entry) => entry.reason === "refund");
    expect(refunds).toHaveLength(1);
  });

  it("works without composite indexes: the owner's newest-first list", async () => {
    const recent = await new ListRecentRedemptions(redemptions(), clock).execute({ businessId, limit: 3 });
    expect(recent.ok && recent.value).toHaveLength(3);
  });
});
