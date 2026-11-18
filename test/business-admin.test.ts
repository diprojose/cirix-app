import { beforeEach, describe, expect, it } from "vitest";
import type { AuditRecord, AuditTrail } from "@/shared/application/audit-trail";
import type { AccountDirectory, DirectoryAccount } from "@/core/tenancy/domain/repositories/account-directory";
import { BusinessSlug, suggestSlug } from "@/core/tenancy/domain/value-objects/business-slug";
import {
  GetBusinessForAdmin,
  ListAllBusinesses,
  RegisterBusiness,
  SetBusinessStatus,
} from "@/core/tenancy/application/use-cases/administer-businesses";
import { ResolveBusinessAccess } from "@/core/tenancy/application/use-cases/resolve-business-access";
import { GetBusinessBySlug } from "@/core/tenancy/application/use-cases/get-business-by-slug";
import {
  InMemoryBusinessRepository,
  InMemoryMembershipRepository,
} from "@/core/tenancy/infrastructure/persistence/in-memory-tenancy-repositories";
import { SetReceiptDemoMode, SaveReceiptSettings } from "@/modules/receipts/application/use-cases/receipt-queries";
import { InMemoryReceiptSettingsRepository } from "@/modules/receipts/infrastructure/persistence/in-memory-receipt-repositories";
import { isBusinessAdminPage, isLoyaltyAppScreen, isMemberPage, requiresPlatformAccess } from "@/lib/auth/route-access";
import { statusForTenancyError } from "@/lib/auth/business-access-status";

const ADMIN = "cirix-admin";

class FakeAccounts implements AccountDirectory {
  readonly accounts = new Map<string, DirectoryAccount>();
  created: string[] = [];

  async findOrCreate(email: string): Promise<DirectoryAccount> {
    let account = this.accounts.get(email);
    if (!account) {
      account = { userId: `user-${this.accounts.size + 1}`, email, disabled: false };
      this.accounts.set(email, account);
      this.created.push(email);
    }
    return account;
  }
}

class FakeAudit implements AuditTrail {
  readonly records: AuditRecord[] = [];
  async record(entry: AuditRecord): Promise<void> {
    this.records.push(entry);
  }
}

let businesses: InMemoryBusinessRepository;
let memberships: InMemoryMembershipRepository;
let accounts: FakeAccounts;
let audit: FakeAudit;

beforeEach(() => {
  businesses = new InMemoryBusinessRepository();
  memberships = new InMemoryMembershipRepository();
  accounts = new FakeAccounts();
  audit = new FakeAudit();
});

const register = (overrides: Partial<{ name: string; slug: string; kind: string; ownerEmail: string }> = {}) =>
  new RegisterBusiness(businesses, memberships, accounts, audit).execute({
    name: "Cafe Luna",
    slug: "cafe-luna",
    kind: "restaurant",
    ownerEmail: "Dueno@Correo.com",
    actorUserId: ADMIN,
    ...overrides,
  });

describe("opening a business", () => {
  it("creates the business and makes the email its owner, even before they ever signed in", async () => {
    const result = await register();
    expect(result.ok && result.value).toMatchObject({ slug: "cafe-luna", name: "Cafe Luna", kind: "restaurant", status: "active" });

    const owner = accounts.accounts.get("dueno@correo.com");
    expect(owner).toBeDefined();
    const id = result.ok ? result.value.id : "";
    const membership = await memberships.find(id, owner!.userId);
    expect(membership?.role).toBe("owner");

    // The owner reaches the panel; nobody else does.
    const gate = new ResolveBusinessAccess(businesses, memberships);
    expect((await gate.execute({ slug: "cafe-luna", userId: owner!.userId, platformAdmin: false })).ok).toBe(true);
    expect((await gate.execute({ slug: "cafe-luna", userId: "stranger", platformAdmin: false })).ok).toBe(false);
  });

  it("records who opened it", async () => {
    await register();
    expect(audit.records).toHaveLength(1);
    expect(audit.records[0]).toMatchObject({ actorId: ADMIN, action: "tenancy.business_created", before: null });
    expect(audit.records[0].after).toMatchObject({ slug: "cafe-luna", ownerEmail: "dueno@correo.com" });
  });

  it("reuses the owner's account when the email already has one", async () => {
    accounts.accounts.set("dueno@correo.com", { userId: "existing", email: "dueno@correo.com", disabled: false });
    const result = await register();
    expect(accounts.created).toEqual([]);
    expect(await memberships.find(result.ok ? result.value.id : "", "existing")).not.toBeNull();
  });

  it("refuses a taken address without reserving an account", async () => {
    await register({ ownerEmail: "first@correo.com" });
    const again = await register({ name: "Otro Cafe", ownerEmail: "second@correo.com" });
    expect(!again.ok && again.error.code).toBe("tenancy/slug-taken");
    expect(accounts.created).toEqual(["first@correo.com"]);
    expect(await businesses.listAll()).toHaveLength(1);
  });

  it.each([
    [{ name: "x" }, "tenancy/invalid-business"],
    [{ slug: "Café Luna" }, "tenancy/invalid-business"],
    [{ slug: "new" }, "tenancy/invalid-business"],
    [{ kind: "other" }, "tenancy/invalid-business"],
    [{ kind: "bank" }, "tenancy/invalid-business"],
    [{ ownerEmail: "not-an-email" }, "tenancy/invalid-membership"],
  ])("refuses %j before writing anything", async (overrides, code) => {
    const result = await register(overrides);
    expect(!result.ok && result.error.code).toBe(code);
    expect(accounts.created).toEqual([]);
    expect(await businesses.listAll()).toEqual([]);
    expect(audit.records).toEqual([]);
  });

  it("refuses a disabled owner account", async () => {
    accounts.accounts.set("dueno@correo.com", { userId: "off", email: "dueno@correo.com", disabled: true });
    const result = await register();
    expect(!result.ok && result.error.code).toBe("tenancy/account-disabled");
    expect(await businesses.listAll()).toEqual([]);
  });

  it("answers each refusal with a status the form can explain", () => {
    expect(statusForTenancyError("tenancy/slug-taken")).toBe(409);
    expect(statusForTenancyError("tenancy/invalid-business")).toBe(400);
  });
});

describe("the list of every business", () => {
  it("shows each business with its owners first, newest business first", async () => {
    await register();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await register({ name: "Super Uno", slug: "super-uno", kind: "supermarket", ownerEmail: "jefe@super.com" });
    const id = second.ok ? second.value.id : "";
    const staff = await accounts.findOrCreate("caja@super.com");
    const { Membership } = await import("@/core/tenancy/domain/entities/membership");
    const membership = Membership.create({ businessId: id, userId: staff.userId, email: staff.email, role: "staff" });
    if (membership.ok) await memberships.save(membership.value);

    const list = await new ListAllBusinesses(businesses, memberships).execute();
    expect(list.ok && list.value.map((business) => business.slug)).toEqual(["super-uno", "cafe-luna"]);
    expect(list.ok && list.value[0].team.map((member) => member.role)).toEqual(["owner", "staff"]);
  });

  it("finds one business by address, also when it is suspended", async () => {
    await register();
    await new SetBusinessStatus(businesses, audit).execute({ slug: "cafe-luna", status: "suspended", actorUserId: ADMIN });
    const found = await new GetBusinessForAdmin(businesses, memberships).execute("Cafe-Luna");
    expect(found.ok && found.value.status).toBe("suspended");
    expect((await new GetBusinessForAdmin(businesses, memberships).execute("nope")).ok).toBe(false);
  });
});

describe("suspending a business", () => {
  it("shuts out its customers and team but not Cirix, and keeps everything for when it reopens", async () => {
    const created = await register();
    const ownerId = accounts.accounts.get("dueno@correo.com")!.userId;
    const setStatus = new SetBusinessStatus(businesses, audit);
    const gate = new ResolveBusinessAccess(businesses, memberships);

    const suspended = await setStatus.execute({ slug: "cafe-luna", status: "suspended", actorUserId: ADMIN });
    expect(suspended.ok && suspended.value.status).toBe("suspended");
    expect((await new GetBusinessBySlug(businesses).execute("cafe-luna")).ok).toBe(false);
    const owner = await gate.execute({ slug: "cafe-luna", userId: ownerId, platformAdmin: false });
    expect(!owner.ok && owner.error.code).toBe("tenancy/suspended");
    expect((await gate.execute({ slug: "cafe-luna", userId: ADMIN, platformAdmin: true })).ok).toBe(true);

    const reopened = await setStatus.execute({ slug: "cafe-luna", status: "active", actorUserId: ADMIN });
    expect(reopened.ok && reopened.value.status).toBe("active");
    expect((await gate.execute({ slug: "cafe-luna", userId: ownerId, platformAdmin: false })).ok).toBe(true);
    expect(await memberships.find(created.ok ? created.value.id : "", ownerId)).not.toBeNull();
  });

  it("records each real change once, and a repeated click changes nothing", async () => {
    await register();
    const setStatus = new SetBusinessStatus(businesses, audit);
    await setStatus.execute({ slug: "cafe-luna", status: "suspended", actorUserId: ADMIN });
    await setStatus.execute({ slug: "cafe-luna", status: "suspended", actorUserId: ADMIN });
    const changes = audit.records.filter((record) => record.action === "tenancy.business_status_changed");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ before: { status: "active" }, after: { status: "suspended" } });
  });

  it("refuses an unknown status or business", async () => {
    await register();
    const setStatus = new SetBusinessStatus(businesses, audit);
    expect((await setStatus.execute({ slug: "cafe-luna", status: "deleted", actorUserId: ADMIN })).ok).toBe(false);
    expect((await setStatus.execute({ slug: "missing", status: "suspended", actorUserId: ADMIN })).ok).toBe(false);
  });
});

describe("receipt demo mode", () => {
  const BIZ = "biz-1";
  let settings: InMemoryReceiptSettingsRepository;
  beforeEach(() => {
    settings = new InMemoryReceiptSettingsRepository();
  });

  it("turns receipts on with it, and off again leaves the owner's rules as they were", async () => {
    const owner = new SaveReceiptSettings(settings);
    await owner.execute({
      businessId: BIZ,
      enabled: false,
      storeNames: ["Cafe Luna"],
      merchantIds: [],
      maxAgeDays: 3,
      maxAmountDollars: 200,
      pointsPerDollar: 2,
      dailyLimit: 3,
    });
    const demo = new SetReceiptDemoMode(settings, audit);

    const on = await demo.execute({ businessId: BIZ, on: true, actorUserId: ADMIN });
    expect(on.ok && on.value).toMatchObject({ demoMode: true, enabled: true, storeNames: ["Cafe Luna"], maxAgeDays: 3 });

    const off = await demo.execute({ businessId: BIZ, on: false, actorUserId: ADMIN });
    expect(off.ok && off.value).toMatchObject({ demoMode: false, enabled: true, storeNames: ["Cafe Luna"], maxAmountDollars: 200 });
    expect(audit.records.map((record) => record.action)).toEqual(["receipts.demo_mode_changed", "receipts.demo_mode_changed"]);
  });

  it("is still out of the owner's reach", async () => {
    await new SetReceiptDemoMode(settings, audit).execute({ businessId: BIZ, on: true, actorUserId: ADMIN });
    const saved = await new SaveReceiptSettings(settings).execute({
      businessId: BIZ,
      enabled: true,
      storeNames: [],
      merchantIds: [],
      maxAgeDays: 2,
      maxAmountDollars: 500,
      pointsPerDollar: 2,
      dailyLimit: 3,
      demoMode: false,
    });
    expect(saved.ok && saved.value.demoMode).toBe(true);
  });

  it("does nothing when it already is as asked", async () => {
    await new SetReceiptDemoMode(settings, audit).execute({ businessId: BIZ, on: false, actorUserId: ADMIN });
    expect(audit.records).toEqual([]);
  });
});

describe("addresses", () => {
  it.each([
    ["Café Luna & Bar", "cafe-luna-bar"],
    ["  Super  Ñandú 24 ", "super-nandu-24"],
    ["¡¡Bravo!!", "bravo"],
    ["A".repeat(60), "a".repeat(40)],
  ])("suggests %j as %j", (name, slug) => {
    expect(suggestSlug(name)).toBe(slug);
    expect(BusinessSlug.create(slug).ok).toBe(true);
  });

  it("never lets a business take the address of the new-business form", () => {
    expect(BusinessSlug.create("new").ok).toBe(false);
    expect(BusinessSlug.create("businesses").ok).toBe(false);
  });
});

describe("the administration pages", () => {
  it.each(["/businesses", "/businesses/new", "/businesses/cafe-luna"])("%s needs an admitted account, in the light theme", (path) => {
    expect(isBusinessAdminPage(path)).toBe(true);
    expect(requiresPlatformAccess(path)).toBe(true);
    expect(isMemberPage(path)).toBe(false);
    expect(isLoyaltyAppScreen(path)).toBe(true);
  });

  it("does not match anything deeper", () => {
    expect(isBusinessAdminPage("/businesses/cafe-luna/edit")).toBe(false);
    expect(isBusinessAdminPage("/businesses-old")).toBe(false);
  });
});
