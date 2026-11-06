import { afterAll, describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";

/*
 * Integration test against a REAL Firestore (opt-in, see
 * firestore-tenancy-crm.integration.test.ts for how to run it). It proves what
 * the in-memory fake cannot: that a batch of create() really lets one of many
 * simultaneous scans of a receipt win, and that the points transaction holds.
 *
 *   FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-receipts.integration.test.ts
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
import type { ReceiptRecord } from "@/modules/receipts/domain/ports/receipt-ports";
import { ReceiptSettings } from "@/modules/receipts/domain/value-objects/receipt-settings";
import {
  FirestorePointsRepository,
  FirestoreReceiptLedger,
  FirestoreReceiptSettingsRepository,
} from "@/modules/receipts/infrastructure/persistence/firestore-receipt-repositories";

const enabled = process.env.FIRESTORE_INTEGRATION === "1";
const businessId = `itest-receipts-${Date.now().toString(36)}`;
const NOW = new Date("2026-03-01T12:00:00.000Z");

const record = (id: string, userId: string, at = NOW.toISOString()): ReceiptRecord => ({
  id,
  businessId,
  userId,
  totalCents: 311,
  date: "2026-03-01",
  transactionId: "015987",
  merchantId: null,
  reward: "points",
  points: 6,
  at,
});

describe.skipIf(!enabled)("Receipts on real Firestore", { timeout: 60_000 }, () => {
  const firestore = enabled ? adminFirestore() : (null as never);
  const ledger = enabled ? new FirestoreReceiptLedger(firestore) : (null as never);
  const points = enabled ? new FirestorePointsRepository(firestore) : (null as never);
  const settings = enabled ? new FirestoreReceiptSettingsRepository(firestore) : (null as never);

  const size = async (collection: string) =>
    (await firestore.collection("businesses").doc(businessId).collection(collection).get()).size;

  afterAll(async () => {
    if (enabled) await firestore.recursiveDelete(firestore.collection("businesses").doc(businessId));
  });

  it("starts with receipts off, and stores the owner's rules", async () => {
    expect((await settings.get(businessId)).enabled).toBe(false);
    const rules = ReceiptSettings.create({ enabled: true, storeNames: ["Bravo"], merchantIds: ["542930"], maxAgeDays: 3, maxAmountDollars: 100, pointsPerDollar: 5, dailyLimit: 2 });
    if (!rules.ok) throw new Error(rules.error.message);
    await settings.save(businessId, rules.value);
    const stored = await settings.get(businessId);
    expect([stored.enabled, stored.storeNames, stored.pointsPerDollar]).toEqual([true, ["Bravo"], 5]);
  });

  it("lets one of many simultaneous scans of a receipt win", async () => {
    const keys = ["trx|015987|race", "auth|04266Q|race"];
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => ledger.claim(record(`race-${index}`, `user-${index}`), keys)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await size("receipts")).toBe(1);
    expect(await size("receipt_keys")).toBe(2);
  });

  it("refuses a receipt when only one of its keys is taken, and writes nothing", async () => {
    expect(await ledger.claim(record("first", "ana"), ["trx|111|partial", "auth|222|partial"])).toBe(true);
    const before = [await size("receipts"), await size("receipt_keys")];
    expect(await ledger.claim(record("second", "luis"), ["trx|999|partial", "auth|222|partial"])).toBe(false);
    expect([await size("receipts"), await size("receipt_keys")]).toEqual(before);
  });

  it("frees a released receipt for another try", async () => {
    const keys = ["trx|333|release"];
    const held = record("held", "ana");
    expect(await ledger.claim(held, keys)).toBe(true);
    await ledger.release(held, keys);
    expect(await ledger.claim(record("again", "ana"), keys)).toBe(true);
  });

  it("counts attempts per person and starts over the next day", async () => {
    expect(await ledger.countAttempt(businessId, "ana", "2026-03-01")).toBe(1);
    expect(await ledger.countAttempt(businessId, "ana", "2026-03-01")).toBe(2);
    expect(await ledger.countAttempt(businessId, "luis", "2026-03-01")).toBe(1);
    expect(await ledger.countAttempt(businessId, "ana", "2026-03-02")).toBe(1);
  });

  it("lists the newest receipts first", async () => {
    await ledger.claim(record("older", "ana", "2020-01-01T00:00:00.000Z"), ["trx|444|list"]);
    await ledger.claim(record("newer", "ana", "2030-01-01T00:00:00.000Z"), ["trx|555|list"]);
    const recent = await ledger.recent(businessId, 100);
    expect(recent[0].id).toBe("newer");
    expect(recent.at(-1)?.id).toBe("older");
  });

  it("holds the balance and the daily limit under simultaneous earnings", async () => {
    const earn = (receiptId: string) =>
      points.transact(businessId, "rosa", (current) => (current ?? PointsAccount.empty(businessId, "rosa", NOW)).earn(5, receiptId, 3, NOW));
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => earn(`r-${index}`)));
    expect(results.filter((result) => result.ok)).toHaveLength(3);
    expect((await points.find(businessId, "rosa"))?.balance).toBe(15);
    const entries = await points.entries(businessId, "rosa", 10);
    expect(entries).toHaveLength(3);
    const balances = await points.findMany(businessId, ["rosa", "nobody"]);
    expect([...balances.keys()]).toEqual(["rosa"]);
  });
});
