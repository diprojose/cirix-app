import { afterAll, describe, expect, it, vi } from "vitest";
import nextEnv from "@next/env";

/*
 * Integration test against a REAL Firestore. It is skipped unless
 * FIRESTORE_INTEGRATION=1, because it writes to the Firebase project configured
 * in .env.local. Everything it creates uses a unique prefix and is deleted at
 * the end. Run it with:
 *
 *   FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-tenancy-crm.integration.test.ts
 *
 * Why it exists: the in-memory fakes cannot prove the parts that only Firestore
 * does, namely transactions (unique slugs, create-if-absent), ALREADY_EXISTS on
 * idempotent events, subcollection layout and ordering without composite indexes.
 */
vi.mock("server-only", () => ({}));

// Next skips .env.local when NODE_ENV is "test" (Vitest's default), so load the
// development environment for this opt-in run only, then restore the mode.
if (process.env.FIRESTORE_INTEGRATION === "1") {
  const env = process.env as Record<string, string | undefined>;
  const mode = env.NODE_ENV;
  env.NODE_ENV = "development";
  nextEnv.loadEnvConfig(process.cwd(), true);
  env.NODE_ENV = mode;
}

import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { Business } from "@/core/tenancy/domain/entities/business";
import { Membership } from "@/core/tenancy/domain/entities/membership";
import { BusinessSlugTakenError } from "@/core/tenancy/domain/errors/tenancy-errors";
import { FirestoreBusinessRepository } from "@/core/tenancy/infrastructure/persistence/firestore-business-repository";
import { FirestoreMembershipRepository } from "@/core/tenancy/infrastructure/persistence/firestore-membership-repository";
import { ResolveBusinessAccess } from "@/core/tenancy/application/use-cases/resolve-business-access";
import { Customer } from "@/modules/crm/domain/entities/customer";
import { CustomerEvent } from "@/modules/crm/domain/entities/customer-event";
import {
  FirestoreCustomerEventRepository,
  FirestoreCustomerRepository,
} from "@/modules/crm/infrastructure/persistence/firestore-crm-repositories";

const enabled = process.env.FIRESTORE_INTEGRATION === "1";
const run = Date.now().toString(36);
const slugOf = (suffix: string) => `itest-${run}-${suffix}`;

// Real network round trips: give each test far more than Vitest's 5 s default.
describe.skipIf(!enabled)("Firestore adapters (real database)", { timeout: 60_000 }, () => {
  const firestore = enabled ? adminFirestore() : (null as never);
  const businesses = enabled ? new FirestoreBusinessRepository(firestore) : (null as never);
  const memberships = enabled ? new FirestoreMembershipRepository(firestore) : (null as never);
  const customers = enabled ? new FirestoreCustomerRepository(firestore) : (null as never);
  const events = enabled ? new FirestoreCustomerEventRepository(firestore) : (null as never);

  const created = { businessIds: [] as string[], slugs: [] as string[], memberKeys: [] as string[], linkKeys: [] as string[] };

  const makeBusiness = (suffix: string) => {
    const result = Business.create({ name: `Integration ${suffix}`, slug: slugOf(suffix), kind: "restaurant" });
    if (!result.ok) throw new Error(result.error.message);
    created.businessIds.push(result.value.id.value);
    created.slugs.push(result.value.slug.value);
    return result.value;
  };

  afterAll(async () => {
    if (!enabled) return;
    for (const id of created.businessIds) await firestore.recursiveDelete(firestore.collection("businesses").doc(id));
    for (const slug of created.slugs) await firestore.collection("business_slugs").doc(slug).delete();
    for (const key of created.memberKeys) await firestore.collection("business_members").doc(key).delete();
    for (const key of created.linkKeys) await firestore.collection("customer_links").doc(key).delete();
  });

  it("stores a business and finds it by id, slug and id list", async () => {
    const business = makeBusiness("find");
    await businesses.create(business);

    expect((await businesses.findById(business.id))?.name).toBe(business.name);
    expect((await businesses.findBySlug(business.slug.value))?.id.value).toBe(business.id.value);
    expect(await businesses.findBySlug(slugOf("missing"))).toBeNull();

    const many = await businesses.findByIds([business.id.value, "does-not-exist"]);
    expect(many.map((item) => item.id.value)).toEqual([business.id.value]);
    expect(await businesses.findByIds([])).toEqual([]);
  });

  it("refuses a second business with the same slug", async () => {
    const first = makeBusiness("dup");
    await businesses.create(first);
    const impostor = Business.restore({
      id: crypto.randomUUID(),
      slug: first.slug.value,
      name: "Impostor",
      kind: "restaurant",
      status: "active",
      createdAt: new Date().toISOString(),
    });
    if (!impostor.ok) throw new Error("setup failed");
    created.businessIds.push(impostor.value.id.value);

    await expect(businesses.create(impostor.value)).rejects.toBeInstanceOf(BusinessSlugTakenError);
    // The loser must leave nothing behind.
    expect(await businesses.findById(impostor.value.id)).toBeNull();
  });

  it("lets exactly one of several simultaneous signups win a slug", async () => {
    const slug = slugOf("race");
    created.slugs.push(slug);
    const contenders = Array.from({ length: 6 }, (_, index) => {
      const result = Business.restore({
        id: crypto.randomUUID(),
        slug,
        name: `Contender ${index}`,
        kind: "other",
        status: "active",
        createdAt: new Date().toISOString(),
      });
      if (!result.ok) throw new Error("setup failed");
      created.businessIds.push(result.value.id.value);
      return result.value;
    });

    const outcomes = await Promise.allSettled(contenders.map((business) => businesses.create(business)));
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(5);
  });

  it("keeps memberships queryable by person and by business, and enforces access", async () => {
    const business = makeBusiness("members");
    await businesses.create(business);
    const owner = Membership.create({ businessId: business.id.value, userId: "u-owner", email: "owner@example.com", role: "owner" });
    const staff = Membership.create({ businessId: business.id.value, userId: "u-staff", email: "staff@example.com", role: "staff" });
    if (!owner.ok || !staff.ok) throw new Error("setup failed");
    created.memberKeys.push(`${business.id.value}_u-owner`, `${business.id.value}_u-staff`);
    await memberships.save(owner.value);
    await memberships.save(staff.value);

    expect((await memberships.find(business.id.value, "u-owner"))?.role).toBe("owner");
    expect(await memberships.find(business.id.value, "stranger")).toBeNull();
    expect((await memberships.listByUser("u-staff")).map((item) => item.businessId)).toContain(business.id.value);
    expect((await memberships.listByBusiness(business.id.value)).map((item) => item.userId).sort()).toEqual(["u-owner", "u-staff"]);

    const gate = new ResolveBusinessAccess(businesses, memberships);
    const asOwner = await gate.execute({ slug: business.slug.value, userId: "u-owner", platformAdmin: false, permission: "customers:read" });
    const asStaff = await gate.execute({ slug: business.slug.value, userId: "u-staff", platformAdmin: false, permission: "customers:read" });
    const asStranger = await gate.execute({ slug: business.slug.value, userId: "stranger", platformAdmin: false });
    expect(asOwner.ok).toBe(true);
    expect(!asStaff.ok && asStaff.error.code).toBe("tenancy/access-denied");
    expect(!asStranger.ok && asStranger.error.code).toBe("tenancy/access-denied");

    await memberships.remove(business.id.value, "u-staff");
    expect(await memberships.find(business.id.value, "u-staff")).toBeNull();
  });

  it("registers a customer once even under concurrent requests", async () => {
    const business = makeBusiness("customer");
    await businesses.create(business);
    const made = Customer.create({
      businessId: business.id.value,
      userId: "u-1",
      email: "ana@example.com",
      name: "Ana",
      source: "table_qr",
    });
    if (!made.ok) throw new Error("setup failed");
    created.linkKeys.push(`u-1_${business.id.value}`);

    const results = await Promise.all(Array.from({ length: 6 }, () => customers.createIfAbsent(made.value)));
    expect(results.filter(Boolean)).toHaveLength(1);

    const found = await customers.find(business.id.value, "u-1");
    expect(found?.name).toBe("Ana");
    expect(await customers.find(business.id.value, "nobody")).toBeNull();
    expect(await customers.listBusinessIdsByUser("u-1")).toContain(business.id.value);
  });

  it("scopes customers to their business and pages them newest first without a composite index", async () => {
    const a = makeBusiness("scope-a");
    const b = makeBusiness("scope-b");
    await businesses.create(a);
    await businesses.create(b);

    const seed = async (businessId: string, userId: string, second: number) => {
      const result = Customer.create(
        { businessId, userId, email: `${userId}@example.com`, name: `Person ${userId}`, source: "web" },
        new Date(Date.UTC(2026, 0, 1, 0, 0, second))
      );
      if (!result.ok) throw new Error("setup failed");
      created.linkKeys.push(`${userId}_${businessId}`);
      await customers.createIfAbsent(result.value);
    };
    await seed(a.id.value, "p1", 1);
    await seed(a.id.value, "p2", 2);
    await seed(a.id.value, "p3", 3);
    await seed(b.id.value, "p9", 9);

    const page1 = await customers.list(a.id.value, { limit: 2 });
    expect(page1.map((customer) => customer.userId)).toEqual(["p3", "p2"]);
    const page2 = await customers.list(a.id.value, { limit: 2, before: page1[1].createdAt });
    expect(page2.map((customer) => customer.userId)).toEqual(["p1"]);
    expect((await customers.list(b.id.value, { limit: 10 })).map((customer) => customer.userId)).toEqual(["p9"]);
  });

  it("appends events idempotently and lists them newest first", async () => {
    const business = makeBusiness("events");
    await businesses.create(business);
    const made = Customer.create({
      businessId: business.id.value,
      userId: "u-ev",
      email: "ev@example.com",
      name: "Eve",
      source: "web",
    });
    if (!made.ok) throw new Error("setup failed");
    created.linkKeys.push(`u-ev_${business.id.value}`);
    await customers.createIfAbsent(made.value);

    const event = (id: string, at: string, data: Record<string, string>) => {
      const result = CustomerEvent.create({ id, businessId: business.id.value, userId: "u-ev", type: "note", data }, new Date(at));
      if (!result.ok) throw new Error("setup failed");
      return result.value;
    };
    await events.append(event("first", "2026-01-01T00:00:00Z", { text: "original" }));
    // Same id again with different content: the first write must win, silently.
    await events.append(event("first", "2026-06-01T00:00:00Z", { text: "retry" }));
    await events.append(event("second", "2026-02-01T00:00:00Z", { text: "later" }));

    const timeline = await events.listByCustomer(business.id.value, "u-ev", 10);
    expect(timeline.map((item) => item.id)).toEqual(["second", "first"]);
    expect(timeline[1].data).toEqual({ text: "original" });
  });
});
