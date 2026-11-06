import { beforeEach, describe, expect, it } from "vitest";
import type { AuditRecord, AuditTrail } from "@/shared/application/audit-trail";
import { StampCard } from "@/modules/stamp-card/domain/entities/stamp-card";
import { StampProgram } from "@/modules/stamp-card/domain/value-objects/stamp-program";
import {
  InMemoryStampCardRepository,
  InMemoryStampProgramRepository,
} from "@/modules/stamp-card/infrastructure/persistence/in-memory-stamp-repositories";
import {
  GetStampActivity,
  ListCardProgress,
  TOP_TABLE_CUSTOMERS,
} from "@/modules/stamp-card/application/use-cases/owner-reports";
import { Membership } from "@/core/tenancy/domain/entities/membership";
import { manageableRoles, roleCanManage } from "@/core/tenancy/domain/value-objects/member-role";
import type { AccountDirectory, DirectoryAccount } from "@/core/tenancy/domain/repositories/account-directory";
import { AddTeamMember, ListTeam, MAX_TEAM_SIZE, RemoveTeamMember } from "@/core/tenancy/application/use-cases/manage-team";
import { InMemoryMembershipRepository } from "@/core/tenancy/infrastructure/persistence/in-memory-tenancy-repositories";
import { statusForTenancyError } from "@/lib/auth/business-access-status";

const BIZ = "biz-1";
const T0 = new Date("2026-03-10T12:00:00.000Z");
const DAY = 86_400_000;

const program = (overrides: Partial<Parameters<typeof StampProgram.create>[0]> = {}) => {
  const result = StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 60, tableStamps: true, ...overrides });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

/** Stamps through the repository, as the use cases do, so the daily totals are fed too. */
const stamp = (cards: InMemoryStampCardRepository, userId: string, staffUserId: string | null, at: Date, rules = program()) =>
  cards.transact(BIZ, userId, (current) => (current ?? StampCard.empty(BIZ, userId, at)).stamp(rules, staffUserId, at));

const redeem = (cards: InMemoryStampCardRepository, userId: string, staffUserId: string, at: Date, rules = program()) =>
  cards.transact(BIZ, userId, (current) => (current ?? StampCard.empty(BIZ, userId, at)).redeem(rules, staffUserId, at));

describe("card progress for the customer list", () => {
  let cards: InMemoryStampCardRepository;
  let programs: InMemoryStampProgramRepository;

  beforeEach(() => {
    cards = new InMemoryStampCardRepository();
    programs = new InMemoryStampProgramRepository();
  });

  it("shows each customer's stamps against the target and leaves out people without a card", async () => {
    await programs.save(BIZ, program());
    await stamp(cards, "u1", "staff-1", T0);
    await stamp(cards, "u1", null, new Date(T0.getTime() + 2 * 3_600_000));
    const result = await new ListCardProgress(cards, programs).execute({ businessId: BIZ, userIds: ["u1", "u2", "u1"] });
    expect(result.ok && result.value).toEqual({
      u1: { stamps: 2, required: 3, rewardReady: false, totalStamps: 2, redeemedCount: 0, lastStampAt: "2026-03-10T14:00:00.000Z" },
    });
  });

  it("reports a reward as ready when the owner lowered the target below what was collected", async () => {
    const generous = program({ requiredStamps: 5 });
    for (let visit = 0; visit < 4; visit++) await stamp(cards, "u1", "staff-1", new Date(T0.getTime() + visit * 2 * 3_600_000), generous);
    await programs.save(BIZ, program({ requiredStamps: 3 }));
    const result = await new ListCardProgress(cards, programs).execute({ businessId: BIZ, userIds: ["u1"] });
    expect(result.ok && result.value.u1).toMatchObject({ stamps: 3, required: 3, rewardReady: true, totalStamps: 4 });
  });

  it("never reads another business's cards", async () => {
    await stamp(cards, "u1", "staff-1", T0);
    const result = await new ListCardProgress(cards, programs).execute({ businessId: "other", userIds: ["u1"] });
    expect(result.ok && result.value).toEqual({});
  });

  it("does no lookup for an empty page", async () => {
    const result = await new ListCardProgress(cards, programs).execute({ businessId: BIZ, userIds: [] });
    expect(result.ok && result.value).toEqual({});
  });
});

describe("stamp activity report", () => {
  let cards: InMemoryStampCardRepository;
  const report = (days: number, now = T0) => new GetStampActivity(cards.activity, () => now).execute({ businessId: BIZ, days });

  beforeEach(() => {
    cards = new InMemoryStampCardRepository();
  });

  it("splits stamps by employee and by source, and counts rewards per employee", async () => {
    await stamp(cards, "u1", "staff-a", T0);
    await stamp(cards, "u2", "staff-a", T0);
    await stamp(cards, "u3", "staff-b", T0);
    await stamp(cards, "u4", null, new Date(T0.getTime() - DAY));
    await stamp(cards, "u4", null, T0);
    await stamp(cards, "u5", "staff-b", new Date(T0.getTime() - 3 * DAY));
    await stamp(cards, "u5", "staff-b", new Date(T0.getTime() - 2 * DAY));
    await stamp(cards, "u5", "staff-b", new Date(T0.getTime() - DAY));
    await redeem(cards, "u5", "staff-b", T0);

    const result = await report(7);
    expect(result.ok && result.value).toEqual({
      fromDay: "2026-03-04",
      toDay: "2026-03-10",
      totalStamps: 8,
      tableStamps: 2,
      receiptStamps: 0,
      staffStamps: 6,
      redemptions: 1,
      byStaff: [
        { userId: "staff-b", stamps: 4, redemptions: 1 },
        { userId: "staff-a", stamps: 2, redemptions: 0 },
      ],
      topTableCustomers: [{ userId: "u4", stamps: 2 }],
    });
  });

  it("covers exactly the chosen number of days, today included", async () => {
    await stamp(cards, "inside", null, new Date("2026-03-04T00:00:00.000Z"));
    await stamp(cards, "outside", null, new Date("2026-03-03T23:59:59.000Z"));
    const week = await report(7);
    expect(week.ok && week.value.topTableCustomers).toEqual([{ userId: "inside", stamps: 1 }]);
    const month = await report(30);
    expect(month.ok && month.value.tableStamps).toBe(2);
  });

  it("lists only the heaviest table QR users, most first", async () => {
    const rules = program({ requiredStamps: 10 });
    for (let customer = 0; customer < TOP_TABLE_CUSTOMERS + 3; customer++) {
      // Oldest visit first: the cooldown refuses a stamp dated before the last one.
      for (let visit = customer % 4; visit >= 0; visit--) {
        await stamp(cards, `c${customer}`, null, new Date(T0.getTime() - visit * DAY), rules);
      }
    }
    const result = await report(30);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.topTableCustomers).toHaveLength(TOP_TABLE_CUSTOMERS);
    const counts = result.value.topTableCustomers.map((entry) => entry.stamps);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[0]).toBe(4);
  });

  it("keeps businesses apart", async () => {
    await cards.transact("other", "u1", () => StampCard.empty("other", "u1", T0).stamp(program(), "staff-x", T0));
    const result = await report(7);
    expect(result.ok && result.value.totalStamps).toBe(0);
  });

  it.each([0, 1, 14, 365, -7, Number.NaN])("refuses a %s-day period", async (days) => {
    const result = await report(days);
    expect(!result.ok && result.error.code).toBe("stamps/invalid-range");
  });
});

/** Accounts by email; reserving one for an unknown address, as Firebase does. */
class FakeAccounts implements AccountDirectory {
  readonly accounts = new Map<string, DirectoryAccount>();
  created: string[] = [];

  add(email: string, userId: string, disabled = false) {
    this.accounts.set(email, { userId, email, disabled });
  }

  async findOrCreate(email: string): Promise<DirectoryAccount> {
    let account = this.accounts.get(email);
    if (!account) {
      account = { userId: `new-${this.created.length + 1}`, email, disabled: false };
      this.accounts.set(email, account);
      this.created.push(email);
    }
    return account;
  }
}

class FakeAudit implements AuditTrail {
  readonly entries: AuditRecord[] = [];
  async record(entry: AuditRecord) {
    this.entries.push(entry);
  }
}

describe("who may manage which roles", () => {
  it("lets owners manage staff only, and Cirix administrators manage both", () => {
    expect(manageableRoles("owner")).toEqual(["staff"]);
    expect(manageableRoles("staff")).toEqual([]);
    expect(manageableRoles("platform_admin")).toEqual(["owner", "staff"]);
    expect(roleCanManage("owner", "owner")).toBe(false);
    expect(roleCanManage("staff", "staff")).toBe(false);
  });

  it("maps team errors to HTTP statuses", () => {
    expect(statusForTenancyError("tenancy/team-change-denied")).toBe(403);
    expect(statusForTenancyError("tenancy/last-owner")).toBe(409);
    expect(statusForTenancyError("tenancy/team-full")).toBe(409);
    expect(statusForTenancyError("tenancy/account-disabled")).toBe(409);
    expect(statusForTenancyError("tenancy/member-not-found")).toBe(404);
    expect(statusForTenancyError("tenancy/invalid-membership")).toBe(400);
  });
});

describe("team management", () => {
  let memberships: InMemoryMembershipRepository;
  let accounts: FakeAccounts;
  let audit: FakeAudit;

  const seed = async (userId: string, role: "owner" | "staff") => {
    const membership = Membership.create({ businessId: BIZ, userId, email: `${userId}@example.com`, role });
    if (!membership.ok) throw new Error(membership.error.message);
    await memberships.save(membership.value);
    accounts.add(`${userId}@example.com`, userId);
  };
  const add = (email: string, role: string, actorRole: "owner" | "staff" | "platform_admin" = "owner") =>
    new AddTeamMember(memberships, accounts, audit).execute({ businessId: BIZ, actorUserId: "actor", actorRole, email, role });
  const remove = (userId: string, actorRole: "owner" | "staff" | "platform_admin" = "owner") =>
    new RemoveTeamMember(memberships, audit).execute({ businessId: BIZ, actorUserId: "actor", actorRole, userId });

  beforeEach(async () => {
    memberships = new InMemoryMembershipRepository();
    accounts = new FakeAccounts();
    audit = new FakeAudit();
    await seed("boss", "owner");
  });

  it("adds staff by email, reserving an account for someone who never signed in", async () => {
    const result = await add("  New.Waiter@Example.com ", "staff");
    expect(result.ok && result.value).toMatchObject({ userId: "new-1", email: "new.waiter@example.com", role: "staff" });
    expect(accounts.created).toEqual(["new.waiter@example.com"]);
    expect((await memberships.find(BIZ, "new-1"))?.role).toBe("staff");
    expect(audit.entries).toEqual([
      expect.objectContaining({ actorId: "actor", action: "tenancy.member_granted", before: null }),
    ]);
  });

  it("reuses the account of someone who already signed in", async () => {
    accounts.add("ana@example.com", "ana");
    const result = await add("ana@example.com", "staff");
    expect(result.ok && result.value.userId).toBe("ana");
    expect(accounts.created).toEqual([]);
  });

  it("treats granting the same role again as done, without a new audit entry", async () => {
    await seed("ana", "staff");
    const result = await add("ana@example.com", "staff");
    expect(result.ok).toBe(true);
    expect(audit.entries).toHaveLength(0);
  });

  it("checks the email before reserving any account", async () => {
    const result = await add("not-an-email", "staff");
    expect(!result.ok && result.error.code).toBe("tenancy/invalid-membership");
    expect(accounts.created).toEqual([]);
  });

  it("refuses unknown roles", async () => {
    const result = await add("ana@example.com", "admin");
    expect(!result.ok && result.error.code).toBe("tenancy/invalid-membership");
  });

  it("does not let an owner create or demote owners", async () => {
    const promote = await add("ana@example.com", "owner");
    expect(!promote.ok && promote.error.code).toBe("tenancy/team-change-denied");
    await seed("partner", "owner");
    const demote = await add("partner@example.com", "staff");
    expect(!demote.ok && demote.error.code).toBe("tenancy/team-change-denied");
    expect((await memberships.find(BIZ, "partner"))?.role).toBe("owner");
  });

  it("does not let staff change the team at all", async () => {
    const result = await add("ana@example.com", "staff", "staff");
    expect(!result.ok && result.error.code).toBe("tenancy/team-change-denied");
    expect(accounts.created).toEqual([]);
  });

  it("lets a Cirix administrator change owners, but never leave the business without one", async () => {
    const lastOwner = await add("boss@example.com", "staff", "platform_admin");
    expect(!lastOwner.ok && lastOwner.error.code).toBe("tenancy/last-owner");
    expect((await add("partner@example.com", "owner", "platform_admin")).ok).toBe(true);
    const demoted = await add("boss@example.com", "staff", "platform_admin");
    expect(demoted.ok && demoted.value.role).toBe("staff");
    expect(audit.entries.at(-1)).toMatchObject({ before: { role: "owner" }, after: { role: "staff" } });
  });

  it("refuses disabled accounts", async () => {
    accounts.add("gone@example.com", "gone", true);
    const result = await add("gone@example.com", "staff");
    expect(!result.ok && result.error.code).toBe("tenancy/account-disabled");
  });

  it("caps the team size", async () => {
    for (let index = 1; index < MAX_TEAM_SIZE; index++) await seed(`s${index}`, "staff");
    const result = await add("one-more@example.com", "staff");
    expect(!result.ok && result.error.code).toBe("tenancy/team-full");
    // Changing someone already on a full team is still allowed.
    expect((await add("s1@example.com", "staff")).ok).toBe(true);
  });

  it("removes staff and records who did it", async () => {
    await seed("ana", "staff");
    const result = await remove("ana");
    expect(result.ok).toBe(true);
    expect(await memberships.find(BIZ, "ana")).toBeNull();
    expect(audit.entries).toEqual([
      expect.objectContaining({ action: "tenancy.member_removed", before: expect.objectContaining({ userId: "ana", role: "staff" }), after: null }),
    ]);
  });

  it("does not let an owner remove an owner, themselves included", async () => {
    const result = await remove("boss");
    expect(!result.ok && result.error.code).toBe("tenancy/team-change-denied");
    expect(await memberships.find(BIZ, "boss")).not.toBeNull();
  });

  it("lets a Cirix administrator remove an owner only while another remains", async () => {
    const last = await remove("boss", "platform_admin");
    expect(!last.ok && last.error.code).toBe("tenancy/last-owner");
    await seed("partner", "owner");
    expect((await remove("boss", "platform_admin")).ok).toBe(true);
  });

  it("reports people who are not on the team", async () => {
    const result = await remove("stranger");
    expect(!result.ok && result.error.code).toBe("tenancy/member-not-found");
  });

  it("lists owners first, then by email", async () => {
    await seed("zed", "staff");
    await seed("amy", "staff");
    await seed("bob", "owner");
    const result = await new ListTeam(memberships).execute(BIZ);
    expect(result.ok && result.value.map((member) => `${member.role}:${member.userId}`)).toEqual([
      "owner:bob",
      "owner:boss",
      "staff:amy",
      "staff:zed",
    ]);
  });
});
