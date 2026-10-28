import { afterAll, describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";

/*
 * Integration test against a REAL Firestore (opt-in, see
 * firestore-tenancy-crm.integration.test.ts for how to run it). It proves what
 * the in-memory fake cannot: that Firestore transactions really serialize
 * simultaneous scans, so the cooldown and the one-reward rule hold under load.
 *
 *   FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-stamp-card.integration.test.ts
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
import { StampCard } from "@/modules/stamp-card/domain/entities/stamp-card";
import { StampProgram } from "@/modules/stamp-card/domain/value-objects/stamp-program";
import {
  FirestoreStampCardRepository,
  FirestoreStampProgramRepository,
  FirestoreTableCodeRepository,
} from "@/modules/stamp-card/infrastructure/persistence/firestore-stamp-repositories";

const enabled = process.env.FIRESTORE_INTEGRATION === "1";
const businessId = `itest-stamps-${Date.now().toString(36)}`;
const T0 = new Date("2026-03-01T12:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

describe.skipIf(!enabled)("Stamp card on real Firestore", { timeout: 60_000 }, () => {
  const firestore = enabled ? adminFirestore() : (null as never);
  const cards = enabled ? new FirestoreStampCardRepository(firestore) : (null as never);
  const programs = enabled ? new FirestoreStampProgramRepository(firestore) : (null as never);

  const program = (() => {
    const result = StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 5 });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  })();

  const count = async (userId: string, collection: "stamps" | "redemptions") =>
    (await firestore.collection("businesses").doc(businessId).collection("customers").doc(userId).collection(collection).get()).size;

  const stamp = (userId: string, when: Date, staff = "staff-1") =>
    cards.transact(businessId, userId, (current) => (current ?? StampCard.empty(businessId, userId, when)).stamp(program, staff, when));
  const redeem = (userId: string, when: Date, staff = "staff-1") =>
    cards.transact(businessId, userId, (current) => (current === null ? StampCard.empty(businessId, userId, when) : current).redeem(program, staff, when));

  afterAll(async () => {
    if (enabled) await firestore.recursiveDelete(firestore.collection("businesses").doc(businessId));
  });

  it("returns the defaults for a business that never configured a program, then stores its rules", async () => {
    expect((await programs.get(businessId)).requiredStamps).toBe(10);
    await programs.save(businessId, program);
    const stored = await programs.get(businessId);
    expect([stored.requiredStamps, stored.rewardName, stored.cooldownMinutes, stored.active]).toEqual([3, "Free coffee", 5, true]);
  });

  it("stores the card and one immutable stamp record, and refuses a stamp inside the cooldown", async () => {
    expect(await cards.find(businessId, "solo")).toBeNull();

    const first = await stamp("solo", T0, "staff-9");
    expect(first.ok).toBe(true);
    expect((await cards.find(businessId, "solo"))?.stamps).toBe(1);
    expect(await count("solo", "stamps")).toBe(1);

    const tooSoon = await stamp("solo", at(1));
    expect(!tooSoon.ok && tooSoon.error.code).toBe("stamps/too-soon");
    // A refused stamp must leave nothing behind.
    expect(await count("solo", "stamps")).toBe(1);
    expect((await cards.find(businessId, "solo"))?.stamps).toBe(1);

    const records = await firestore.collection("businesses").doc(businessId).collection("customers").doc("solo").collection("stamps").get();
    expect(records.docs[0].data()).toMatchObject({ staffUserId: "staff-9", sequence: 1 });
  });

  it("adds exactly one stamp when many scans of the same customer arrive at the same instant", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => stamp("race", T0, `staff-${index}`)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error.code === "stamps/too-soon")).toHaveLength(7);
    expect(await count("race", "stamps")).toBe(1);
    expect((await cards.find(businessId, "race"))?.totalStamps).toBe(1);
  });

  it("completes a card, blocks more stamps, and hands over the reward exactly once", async () => {
    for (const minutes of [0, 5, 10]) {
      const result = await stamp("cycle", at(minutes));
      expect(result.ok, `stamp at +${minutes} min`).toBe(true);
    }
    const card = await cards.find(businessId, "cycle");
    expect([card?.stamps, card?.rewardReady, card?.totalStamps]).toEqual([3, true, 3]);

    const blocked = await stamp("cycle", at(15));
    expect(!blocked.ok && blocked.error.code).toBe("stamps/reward-pending");
    expect(await count("cycle", "stamps")).toBe(3);

    const attempts = await Promise.all(Array.from({ length: 5 }, () => redeem("cycle", at(16))));
    expect(attempts.filter((result) => result.ok)).toHaveLength(1);
    expect(await count("cycle", "redemptions")).toBe(1);

    const after = await cards.find(businessId, "cycle");
    expect([after?.stamps, after?.rewardReady, after?.redeemedCount, after?.totalStamps]).toEqual([0, false, 1, 3]);

    const next = await stamp("cycle", at(30));
    expect(next.ok && next.value.card.stamps).toBe(1);
  });

  it("keeps each customer's card independent", async () => {
    await Promise.all([stamp("indep-a", T0), stamp("indep-b", T0)]);
    expect((await cards.find(businessId, "indep-a"))?.stamps).toBe(1);
    expect((await cards.find(businessId, "indep-b"))?.stamps).toBe(1);
  });

  it("stores a table stamp with its source and no employee, and reads table stamps back from the program", async () => {
    const tableProgram = StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 60, tableStamps: true });
    if (!tableProgram.ok) throw new Error(tableProgram.error.message);
    await programs.save(businessId, tableProgram.value);
    expect((await programs.get(businessId)).tableStamps).toBe(true);

    const result = await cards.transact(businessId, "table", (current) =>
      (current ?? StampCard.empty(businessId, "table", T0)).stamp(tableProgram.value, null, T0)
    );
    expect(result.ok).toBe(true);
    const records = await firestore.collection("businesses").doc(businessId).collection("customers").doc("table").collection("stamps").get();
    expect(records.docs[0].data()).toMatchObject({ source: "table_qr", staffUserId: null, sequence: 1 });
  });

  it("reads a program saved before table stamps existed as table stamps off", async () => {
    await firestore.collection("businesses").doc(businessId).collection("settings").doc("stamp_program")
      .set({ requiredStamps: 4, rewardName: "Free tea", cooldownMinutes: 10, active: true });
    const stored = await programs.get(businessId);
    expect([stored.requiredStamps, stored.tableStamps]).toEqual([4, false]);
  });

  it("agrees on one table code when many first requests arrive at once, and replaces it on rotate", async () => {
    const codes = new FirestoreTableCodeRepository(firestore);
    const first = await Promise.all(Array.from({ length: 6 }, () => codes.current(businessId)));
    expect(new Set(first.map((entry) => entry.code)).size).toBe(1);
    expect((await codes.current(businessId)).code).toBe(first[0].code);

    const rotated = await codes.rotate(businessId);
    expect(rotated.code).not.toBe(first[0].code);
    expect((await codes.current(businessId)).code).toBe(rotated.code);
  });
});
