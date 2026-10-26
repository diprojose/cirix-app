import { beforeEach, describe, expect, it } from "vitest";
import { Business } from "@/core/tenancy/domain/entities/business";
import { BusinessSlug } from "@/core/tenancy/domain/value-objects/business-slug";
import { roleCan } from "@/core/tenancy/domain/value-objects/member-role";
import { AddMember } from "@/core/tenancy/application/use-cases/add-member";
import { CreateBusiness } from "@/core/tenancy/application/use-cases/create-business";
import { GetBusinessBySlug } from "@/core/tenancy/application/use-cases/get-business-by-slug";
import { ListBusinessesByIds } from "@/core/tenancy/application/use-cases/list-businesses-by-ids";
import { ListMyBusinesses } from "@/core/tenancy/application/use-cases/list-my-businesses";
import { ResolveBusinessAccess } from "@/core/tenancy/application/use-cases/resolve-business-access";
import {
  InMemoryBusinessRepository,
  InMemoryMembershipRepository,
} from "@/core/tenancy/infrastructure/persistence/in-memory-tenancy-repositories";

let businesses: InMemoryBusinessRepository;
let memberships: InMemoryMembershipRepository;

beforeEach(() => {
  businesses = new InMemoryBusinessRepository();
  memberships = new InMemoryMembershipRepository();
});

const create = (name: string, slug: string, ownerId?: string) =>
  new CreateBusiness(businesses, memberships).execute({
    name,
    slug,
    kind: "restaurant",
    owner: ownerId ? { userId: ownerId, email: `${ownerId}@example.com` } : undefined,
  });

const access = (slug: string, userId: string, extra: { platformAdmin?: boolean; permission?: "customers:read" | "visits:record" } = {}) =>
  new ResolveBusinessAccess(businesses, memberships).execute({ slug, userId, platformAdmin: false, ...extra });

describe("business slug", () => {
  it.each(["cafe-luna", "super123", "a1b"])("accepts %s", (value) => {
    expect(BusinessSlug.create(value).ok).toBe(true);
  });

  it("normalizes case and surrounding spaces", () => {
    const slug = BusinessSlug.create("  Cafe-Luna ");
    expect(slug.ok && slug.value.value).toBe("cafe-luna");
  });

  it.each(["ab", "-cafe", "cafe-", "caf  e", "caf--e", "café", "a".repeat(41), "admin", "api", "login"])(
    "rejects %j",
    (value) => {
      expect(BusinessSlug.create(value).ok).toBe(false);
    }
  );
});

describe("business", () => {
  it("rejects a bad name, a bad slug and an unknown kind", () => {
    expect(Business.create({ name: "x", slug: "cafe-luna", kind: "restaurant" }).ok).toBe(false);
    expect(Business.create({ name: "Cafe Luna", slug: "!!", kind: "restaurant" }).ok).toBe(false);
    expect(Business.create({ name: "Cafe Luna", slug: "cafe-luna", kind: "bank" }).ok).toBe(false);
  });

  it("starts active and survives a snapshot round trip", () => {
    const created = Business.create({ name: " Cafe Luna ", slug: "cafe-luna", kind: "restaurant" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.isActive).toBe(true);
    expect(created.value.name).toBe("Cafe Luna");
    const restored = Business.restore({
      id: created.value.id.value,
      slug: created.value.slug.value,
      name: created.value.name,
      kind: created.value.kind,
      status: created.value.status,
      createdAt: created.value.createdAt,
    });
    expect(restored.ok && restored.value.id.equals(created.value.id)).toBe(true);
  });

  it("refuses to restore corrupt data", () => {
    const restored = Business.restore({ id: "1", slug: "cafe-luna", name: "Cafe", kind: "restaurant", status: "weird", createdAt: "" });
    expect(restored.ok).toBe(false);
  });
});

describe("create business", () => {
  it("creates a business and makes the first owner a member", async () => {
    const result = await create("Cafe Luna", "cafe-luna", "owner-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const membership = await memberships.find(result.value.id, "owner-1");
    expect(membership?.role).toBe("owner");
  });

  it("does not let two businesses share an address", async () => {
    expect((await create("Cafe Luna", "cafe-luna")).ok).toBe(true);
    const second = await create("Otro Cafe", "cafe-luna");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("tenancy/slug-taken");
  });

  it("writes nothing when the owner is invalid", async () => {
    const result = await new CreateBusiness(businesses, memberships).execute({
      name: "Cafe Luna",
      slug: "cafe-luna",
      kind: "restaurant",
      owner: { userId: "owner-1", email: "not-an-email" },
    });
    expect(result.ok).toBe(false);
    expect(await businesses.findBySlug("cafe-luna")).toBeNull();
  });
});

describe("public business view", () => {
  it("finds an active business by a case-insensitive slug and exposes no private data", async () => {
    await create("Cafe Luna", "cafe-luna", "owner-1");
    const result = await new GetBusinessBySlug(businesses).execute("CAFE-LUNA");
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value).sort()).toEqual(["id", "kind", "name", "slug", "status"]);
  });

  it("reports an unknown business", async () => {
    const result = await new GetBusinessBySlug(businesses).execute("nope");
    expect(!result.ok && result.error.code).toBe("tenancy/not-found");
  });

  it("omits unknown ids and de-duplicates when listing by ids", async () => {
    const one = await create("Cafe Luna", "cafe-luna");
    const result = await new ListBusinessesByIds(businesses).execute([
      one.ok ? one.value.id : "",
      one.ok ? one.value.id : "",
      "missing",
    ]);
    expect(result.ok && result.value).toHaveLength(1);
  });
});

describe("tenant isolation", () => {
  it("lets an owner into their own business only", async () => {
    await create("Cafe Luna", "cafe-luna", "owner-a");
    await create("Super Sol", "super-sol", "owner-b");

    const own = await access("cafe-luna", "owner-a", { permission: "customers:read" });
    expect(own.ok && own.value.role).toBe("owner");

    const foreign = await access("super-sol", "owner-a", { permission: "customers:read" });
    expect(!foreign.ok && foreign.error.code).toBe("tenancy/access-denied");
  });

  it("denies a person who is only a customer", async () => {
    await create("Cafe Luna", "cafe-luna", "owner-a");
    const result = await access("cafe-luna", "just-a-customer");
    expect(!result.ok && result.error.code).toBe("tenancy/access-denied");
  });

  it("lets staff validate visits but not read customers", async () => {
    const business = await create("Cafe Luna", "cafe-luna", "owner-a");
    if (!business.ok) throw new Error("setup failed");
    await new AddMember(businesses, memberships).execute({
      businessId: business.value.id,
      userId: "staff-1",
      email: "staff@example.com",
      role: "staff",
    });

    expect((await access("cafe-luna", "staff-1", { permission: "visits:record" })).ok).toBe(true);
    const customers = await access("cafe-luna", "staff-1", { permission: "customers:read" });
    expect(!customers.ok && customers.error.code).toBe("tenancy/access-denied");
  });

  it("lets a platform administrator into any business", async () => {
    await create("Cafe Luna", "cafe-luna", "owner-a");
    const result = await access("cafe-luna", "cirix-admin", { platformAdmin: true, permission: "customers:read" });
    expect(result.ok && result.value.role).toBe("platform_admin");
  });

  it("returns not found, not denied, for a business that does not exist", async () => {
    const result = await access("ghost", "owner-a");
    expect(!result.ok && result.error.code).toBe("tenancy/not-found");
  });

  it("cannot be bypassed by a different casing of the slug", async () => {
    await create("Cafe Luna", "cafe-luna", "owner-a");
    await create("Super Sol", "super-sol", "owner-b");
    const result = await access("SUPER-SOL", "owner-a");
    expect(result.ok).toBe(false);
  });

  it("changes a role when it is granted again", async () => {
    const business = await create("Cafe Luna", "cafe-luna", "owner-a");
    if (!business.ok) throw new Error("setup failed");
    const add = (role: string) =>
      new AddMember(businesses, memberships).execute({ businessId: business.value.id, userId: "p1", email: "p@example.com", role });
    await add("staff");
    await add("owner");
    expect((await memberships.find(business.value.id, "p1"))?.role).toBe("owner");
    expect((await add("manager")).ok).toBe(false);
  });

  it("rejects adding a member to a business that does not exist", async () => {
    const result = await new AddMember(businesses, memberships).execute({
      businessId: "missing",
      userId: "p1",
      email: "p@example.com",
      role: "staff",
    });
    expect(!result.ok && result.error.code).toBe("tenancy/not-found");
  });
});

describe("suspended businesses", () => {
  it("blocks members but not administrators", async () => {
    const created = await create("Cafe Luna", "cafe-luna", "owner-a");
    if (!created.ok) throw new Error("setup failed");
    const stored = await businesses.findBySlug("cafe-luna");
    const snapshot = {
      id: created.value.id,
      slug: "cafe-luna",
      name: "Cafe Luna",
      kind: "restaurant",
      status: "suspended",
      createdAt: stored!.createdAt,
    };
    const suspended = Business.restore(snapshot);
    if (!suspended.ok) throw new Error("setup failed");
    // Swap the stored business for its suspended twin.
    (businesses as unknown as { items: Map<string, Business> }).items.set(created.value.id, suspended.value);

    const member = await access("cafe-luna", "owner-a");
    expect(!member.ok && member.error.code).toBe("tenancy/suspended");
    expect((await access("cafe-luna", "admin", { platformAdmin: true })).ok).toBe(true);
    expect((await new GetBusinessBySlug(businesses).execute("cafe-luna")).ok).toBe(false);
    expect((await new ListMyBusinesses(businesses, memberships).execute("owner-a"))).toEqual({ ok: true, value: [] });
  });
});

describe("my businesses", () => {
  it("lists only the businesses where the person holds a role", async () => {
    await create("Cafe Luna", "cafe-luna", "p1");
    await create("Super Sol", "super-sol", "p2");
    const result = await new ListMyBusinesses(businesses, memberships).execute("p1");
    expect(result.ok && result.value.map((item) => item.business.slug)).toEqual(["cafe-luna"]);
  });
});

describe("role permissions", () => {
  it("keeps customer data away from staff", () => {
    expect(roleCan("owner", "customers:read")).toBe(true);
    expect(roleCan("staff", "customers:read")).toBe(false);
    expect(roleCan("staff", "visits:record")).toBe(true);
    expect(roleCan("staff", "members:manage")).toBe(false);
    expect(roleCan("platform_admin", "members:manage")).toBe(true);
  });
});
