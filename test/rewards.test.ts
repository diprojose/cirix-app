import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ok } from "@/shared/domain/result";
import { PointsAccount } from "@/modules/receipts/domain/entities/points-account";
import {
  formatRedemptionCode,
  generateRedemptionCode,
  normalizeRedemptionCode,
  Redemption,
  REDEMPTION_DAYS,
} from "@/modules/receipts/domain/entities/redemption";
import { buildReward, REWARD_LIMITS } from "@/modules/receipts/domain/entities/reward";
import {
  CancelRedemption,
  DeleteReward,
  DeliverRedemption,
  ListMyRedemptions,
  ListRecentRedemptions,
  ListRewards,
  PreviewRedemption,
  RedeemPoints,
  SaveReward,
} from "@/modules/receipts/application/use-cases/reward-use-cases";
import { GetPointsSummary } from "@/modules/receipts/application/use-cases/receipt-queries";
import {
  InMemoryPointsRepository,
  InMemoryRedemptionRepository,
  InMemoryRewardCatalog,
} from "@/modules/receipts/infrastructure/persistence/in-memory-receipt-repositories";
import { statusForReceiptError } from "@/lib/receipts/http";

const BUSINESS = "super";
const START = new Date("2026-11-06T12:00:00.000Z");
const DAY = 86_400_000;

let now: Date;
let points: InMemoryPointsRepository;
let catalog: InMemoryRewardCatalog;
let redemptions: InMemoryRedemptionRepository;
let timeline: { eventId: string; rewardName: string }[];
const clock = () => now;

const customers = { exists: async (_business: string, userId: string) => userId !== "stranger" };
const names = { firstName: async () => "Ana" };
const activity = { rewardRedeemed: async (entry: { eventId: string; rewardName: string }) => void timeline.push(entry) };

const rewardCases = () => ({
  save: new SaveReward(catalog, clock),
  remove: new DeleteReward(catalog),
  list: new ListRewards(catalog),
  redeem: new RedeemPoints(catalog, customers, redemptions, clock),
  cancel: new CancelRedemption(redemptions, clock),
  mine: new ListMyRedemptions(redemptions, clock),
  recent: new ListRecentRedemptions(redemptions, clock),
  preview: new PreviewRedemption(redemptions, names, clock),
  deliver: new DeliverRedemption(redemptions, names, activity, clock),
  summary: new GetPointsSummary(points),
});

async function giveAna(amount: number) {
  await points.transact(BUSINESS, "ana", (current) => (current ?? PointsAccount.empty(BUSINESS, "ana", now)).earn(amount, `r-${amount}`, 100, now));
}

const balance = async (userId = "ana") => (await points.find(BUSINESS, userId))?.balance ?? 0;

async function addReward(pointsCost = 100, active = true) {
  const saved = await rewardCases().save.execute({ businessId: BUSINESS, rewardId: null, name: "Café gratis", description: "", points: pointsCost, active });
  if (!saved.ok) throw saved.error;
  return saved.value;
}

async function openCode(rewardId: string, userId = "ana") {
  const opened = await rewardCases().redeem.execute({ businessId: BUSINESS, userId, rewardId });
  if (!opened.ok) throw opened.error;
  return opened.value.code;
}

beforeEach(() => {
  now = START;
  timeline = [];
  points = new InMemoryPointsRepository();
  catalog = new InMemoryRewardCatalog();
  redemptions = new InMemoryRedemptionRepository(points);
});

describe("reward codes", () => {
  it("generates codes people can read out, with no confusing characters", () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateRedemptionCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("accepts what a person might type, in any shape", () => {
    expect(normalizeRedemptionCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeRedemptionCode(" ABCD EFGH ")).toBe("ABCDEFGH");
    expect(formatRedemptionCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it.each(["", "ABC", "ABCDEFGHJ", "ABCD/EFG", "../../abc", "ABCDEFG0", "ABCDEFGI", "https://x.example/ABCDEFGH"])(
    "refuses %s, so it never reaches a storage path",
    (text) => expect(normalizeRedemptionCode(text)).toBeNull()
  );
});

describe("the prize catalog", () => {
  const identity = { id: "r1", businessId: BUSINESS };

  it("tidies the name", () => {
    const reward = buildReward({ name: "  Café   gratis ", description: " rico ", points: 10, active: true }, identity, START);
    expect(reward.ok && reward.value).toMatchObject({ name: "Café gratis", description: "rico" });
  });

  it.each([
    ["a short name", { name: "x", description: "", points: 10 }],
    ["a long name", { name: "x".repeat(REWARD_LIMITS.maxName + 1), description: "", points: 10 }],
    ["a long description", { name: "Café", description: "x".repeat(REWARD_LIMITS.maxDescription + 1), points: 10 }],
    ["no cost", { name: "Café", description: "", points: 0 }],
    ["a negative cost", { name: "Café", description: "", points: -5 }],
    ["a fractional cost", { name: "Café", description: "", points: 1.5 }],
    ["an absurd cost", { name: "Café", description: "", points: REWARD_LIMITS.maxPoints + 1 }],
    ["a cost that is not a number", { name: "Café", description: "", points: Number.NaN }],
  ])("refuses %s", (_label, input) => {
    expect(buildReward({ ...input, active: true }, identity, START).ok).toBe(false);
  });

  it("lists the cheapest first, and hides what the owner hid from customers", async () => {
    await addReward(300);
    await addReward(100);
    await addReward(200, false);
    const { list } = rewardCases();
    const all = await list.execute({ businessId: BUSINESS, activeOnly: false });
    const visible = await list.execute({ businessId: BUSINESS, activeOnly: true });
    expect(all.ok && all.value.map((reward) => reward.points)).toEqual([100, 200, 300]);
    expect(visible.ok && visible.value.map((reward) => reward.points)).toEqual([100, 300]);
  });

  it("changes a prize and keeps when it was created", async () => {
    const reward = await addReward(100);
    now = new Date(START.getTime() + DAY);
    const changed = await rewardCases().save.execute({ businessId: BUSINESS, rewardId: reward.id, name: "Té gratis", description: "", points: 50, active: true });
    expect(changed.ok && changed.value).toMatchObject({ id: reward.id, name: "Té gratis", points: 50 });
    expect((await catalog.find(BUSINESS, reward.id))?.createdAt).toBe(START.toISOString());
  });

  it("does not change or delete a prize of another business, or a strange id", async () => {
    const reward = await addReward(100);
    const { save, remove } = rewardCases();
    const input = { name: "Té", description: "", points: 1, active: true };
    expect((await save.execute({ businessId: "other", rewardId: reward.id, ...input })).ok).toBe(false);
    expect((await save.execute({ businessId: BUSINESS, rewardId: "../../x", ...input })).ok).toBe(false);
    expect((await remove.execute({ businessId: "other", rewardId: reward.id })).ok).toBe(false);
    expect((await remove.execute({ businessId: BUSINESS, rewardId: "../../x" })).ok).toBe(false);
    expect(await catalog.find(BUSINESS, reward.id)).not.toBeNull();
  });

  it("stops growing at the limit", async () => {
    for (let index = 0; index < REWARD_LIMITS.maxRewards; index += 1) await addReward(index + 1);
    const extra = await rewardCases().save.execute({ businessId: BUSINESS, rewardId: null, name: "Uno más", description: "", points: 1, active: true });
    expect(!extra.ok && extra.error.code).toBe("rewards/catalog-full");
  });
});

describe("redeeming points", () => {
  it("takes the points when the code opens, and records the movement", async () => {
    await giveAna(150);
    const reward = await addReward(100);
    const code = await openCode(reward.id);
    expect(await balance()).toBe(50);
    expect((await points.find(BUSINESS, "ana"))?.totalEarned).toBe(150);
    const summary = await rewardCases().summary.execute({ businessId: BUSINESS, userId: "ana" });
    expect(summary.ok && summary.value.entries[0]).toMatchObject({ delta: -100, balance: 50, reason: "redemption" });
    expect(points.ledger.at(-1)).toMatchObject({ redemptionCode: code });
  });

  it("allows spending the exact balance", async () => {
    await giveAna(100);
    await openCode((await addReward(100)).id);
    expect(await balance()).toBe(0);
  });

  it("refuses when the balance is short, one point short included", async () => {
    await giveAna(99);
    const reward = await addReward(100);
    const result = await rewardCases().redeem.execute({ businessId: BUSINESS, userId: "ana", rewardId: reward.id });
    expect(!result.ok && result.error.code).toBe("rewards/not-enough-points");
    expect(await balance()).toBe(99);
    expect(redemptions.items.size).toBe(0);
  });

  it("refuses someone with no points at all", async () => {
    const reward = await addReward(1);
    const result = await rewardCases().redeem.execute({ businessId: BUSINESS, userId: "ana", rewardId: reward.id });
    expect(!result.ok && result.error.code).toBe("rewards/not-enough-points");
  });

  it("refuses someone who is not a customer", async () => {
    const reward = await addReward(1);
    const result = await rewardCases().redeem.execute({ businessId: BUSINESS, userId: "stranger", rewardId: reward.id });
    expect(!result.ok && result.error.code).toBe("receipts/not-a-customer");
  });

  it("refuses a hidden, deleted or unknown prize", async () => {
    await giveAna(500);
    const hidden = await addReward(100, false);
    const deleted = await addReward(100);
    await rewardCases().remove.execute({ businessId: BUSINESS, rewardId: deleted.id });
    for (const rewardId of [hidden.id, deleted.id, "nope", "../../x"]) {
      const result = await rewardCases().redeem.execute({ businessId: BUSINESS, userId: "ana", rewardId });
      expect(!result.ok && result.error.code, rewardId).toBe("rewards/not-found");
    }
    expect(await balance()).toBe(500);
  });

  it("keeps the price and name of an open code when the catalog changes", async () => {
    await giveAna(100);
    const reward = await addReward(100);
    const code = await openCode(reward.id);
    const { save, remove, preview } = rewardCases();
    await save.execute({ businessId: BUSINESS, rewardId: reward.id, name: "Otro", description: "", points: 999, active: true });
    await remove.execute({ businessId: BUSINESS, rewardId: reward.id });
    const shown = await preview.execute({ businessId: BUSINESS, code });
    expect(shown.ok && shown.value).toMatchObject({ rewardName: "Café gratis", points: 100 });
  });
});

describe("handing the prize over", () => {
  it("shows staff who and what without changing anything", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const shown = await rewardCases().preview.execute({ businessId: BUSINESS, code: formatRedemptionCode(code).toLowerCase() });
    expect(shown.ok && shown.value).toEqual({ code, firstName: "Ana", rewardName: "Café gratis", points: 100 });
    expect((await redemptions.find(BUSINESS, code))?.status).toBe("pending");
  });

  it("delivers once, records who did it and takes no more points", async () => {
    await giveAna(300);
    const code = await openCode((await addReward(100)).id);
    const { deliver } = rewardCases();
    const first = await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(first.ok && first.value.rewardName).toBe("Café gratis");
    expect(await balance()).toBe(200);
    expect((await redemptions.find(BUSINESS, code))?.toSnapshot()).toMatchObject({ status: "delivered", staffUserId: "cajero", resolvedAt: START.toISOString() });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].eventId).toBe(`redemption-${code}`);

    const again = await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(!again.ok && again.error.code).toBe("rewards/already-delivered");
    expect(await balance()).toBe(200);
    expect(timeline).toHaveLength(1);
  });

  it("refuses a code of another business", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const { preview, deliver } = rewardCases();
    const shown = await preview.execute({ businessId: "other", code });
    const given = await deliver.execute({ businessId: "other", code, staffUserId: "cajero" });
    expect(!shown.ok && shown.error.code).toBe("rewards/code-not-found");
    expect(!given.ok && given.error.code).toBe("rewards/code-not-found");
    expect((await redemptions.find(BUSINESS, code))?.status).toBe("pending");
  });

  it("refuses things that are not codes", async () => {
    const result = await rewardCases().preview.execute({ businessId: BUSINESS, code: "https://evil.example" });
    expect(!result.ok && result.error.code).toBe("rewards/invalid-code");
  });

  it("does not lose a delivered prize if the timeline fails", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const failing = { rewardRedeemed: async () => Promise.reject(new Error("down")) };
    const result = await new DeliverRedemption(redemptions, names, failing, clock).execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(result.ok).toBe(true);
    expect((await redemptions.find(BUSINESS, code))?.status).toBe("delivered");
  });
});

describe("cancelling a code", () => {
  it("returns the points once", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const { cancel, summary } = rewardCases();
    const first = await cancel.execute({ businessId: BUSINESS, userId: "ana", code });
    expect(first.ok && first.value.status).toBe("cancelled");
    expect(await balance()).toBe(100);
    const movements = await summary.execute({ businessId: BUSINESS, userId: "ana" });
    expect(movements.ok && movements.value.entries[0]).toMatchObject({ delta: 100, reason: "refund" });

    const again = await cancel.execute({ businessId: BUSINESS, userId: "ana", code });
    expect(!again.ok && again.error.code).toBe("rewards/cancelled");
    expect(await balance()).toBe(100);
  });

  it("cannot be scanned afterwards", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const { cancel, preview, deliver } = rewardCases();
    await cancel.execute({ businessId: BUSINESS, userId: "ana", code });
    const shown = await preview.execute({ businessId: BUSINESS, code });
    const given = await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(!shown.ok && shown.error.code).toBe("rewards/cancelled");
    expect(!given.ok && given.error.code).toBe("rewards/cancelled");
  });

  it("cannot get the points back after the prize was handed over", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const { cancel, deliver } = rewardCases();
    await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    const result = await cancel.execute({ businessId: BUSINESS, userId: "ana", code });
    expect(!result.ok && result.error.code).toBe("rewards/already-delivered");
    expect(await balance()).toBe(0);
  });

  it("does not let one customer cancel another's code", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    const result = await rewardCases().cancel.execute({ businessId: BUSINESS, userId: "luis", code });
    expect(!result.ok && result.error.code).toBe("rewards/code-not-found");
    expect(await balance()).toBe(0);
    expect((await redemptions.find(BUSINESS, code))?.status).toBe("pending");
  });
});

describe("expired codes", () => {
  const afterExpiry = () => new Date(START.getTime() + REDEMPTION_DAYS * DAY);

  it("still works on its last moment", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    now = new Date(afterExpiry().getTime() - 1);
    expect((await rewardCases().deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" })).ok).toBe(true);
  });

  it("is refused at the counter, and the points go back exactly once", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    now = afterExpiry();
    const { preview, deliver } = rewardCases();
    const shown = await preview.execute({ businessId: BUSINESS, code });
    expect(!shown.ok && shown.error.code).toBe("rewards/expired");
    expect(await balance()).toBe(0);

    const given = await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(!given.ok && given.error.code).toBe("rewards/expired");
    expect(await balance()).toBe(100);

    const again = await deliver.execute({ businessId: BUSINESS, code, staffUserId: "cajero" });
    expect(!again.ok && again.error.code).toBe("rewards/expired");
    expect(await balance()).toBe(100);
    expect(timeline).toHaveLength(0);
  });

  it("returns the points when the customer opens their list, once", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    now = afterExpiry();
    const { mine } = rewardCases();
    const first = await mine.execute({ businessId: BUSINESS, userId: "ana" });
    expect(first.ok && first.value[0]).toMatchObject({ code, status: "expired" });
    expect(await balance()).toBe(100);
    await mine.execute({ businessId: BUSINESS, userId: "ana" });
    expect(await balance()).toBe(100);
  });

  it("closes as expired, returning the points, if the customer cancels it late", async () => {
    await giveAna(100);
    const code = await openCode((await addReward(100)).id);
    now = afterExpiry();
    const result = await rewardCases().cancel.execute({ businessId: BUSINESS, userId: "ana", code });
    expect(result.ok && result.value.status).toBe("expired");
    expect(await balance()).toBe(100);
  });

  it("shows as expired to the owner before anyone has closed it", async () => {
    await giveAna(100);
    await openCode((await addReward(100)).id);
    now = afterExpiry();
    const recent = await rewardCases().recent.execute({ businessId: BUSINESS, limit: 10 });
    expect(recent.ok && recent.value[0].status).toBe("expired");
    expect(await balance()).toBe(0);
  });
});

describe("a customer's list", () => {
  it("shows only their own codes, newest first", async () => {
    await giveAna(300);
    await points.transact(BUSINESS, "luis", () => PointsAccount.empty(BUSINESS, "luis", now).earn(100, "r", 9, now));
    const reward = await addReward(100);
    const older = await openCode(reward.id);
    now = new Date(START.getTime() + 1000);
    const newer = await openCode(reward.id);
    await openCode(reward.id, "luis");
    const mine = await rewardCases().mine.execute({ businessId: BUSINESS, userId: "ana" });
    expect(mine.ok && mine.value.map((redemption) => redemption.code)).toEqual([newer, older]);
  });
});

describe("the entity's rules", () => {
  const reward = { id: "r", businessId: BUSINESS, name: "Café", description: "", points: 10, active: true, createdAt: "", updatedAt: "" };

  it("cannot be spent beyond the balance", () => {
    const account = PointsAccount.empty(BUSINESS, "ana", START);
    const spent = account.spend(1, "ABCDEFGH", START);
    expect(!spent.ok && spent.error.code).toBe("rewards/not-enough-points");
  });

  it("opens with a date 30 days ahead", () => {
    const code = Redemption.open(reward, "ana", START);
    expect(Date.parse(code.expiresAt) - START.getTime()).toBe(REDEMPTION_DAYS * DAY);
    expect(code.isOverdue(START)).toBe(false);
  });

  it("restored accounts still hold after spending and refunding", async () => {
    await giveAna(100);
    const account = (await points.find(BUSINESS, "ana"))!;
    const spent = account.spend(100, "ABCDEFGH", START);
    if (!spent.ok) throw spent.error;
    const back = spent.value.account.refund(100, "ABCDEFGH", START).account;
    expect(PointsAccount.restore(back.toSnapshot()).ok).toBe(true);
    expect(ok(back.balance)).toEqual(ok(100));
  });
});

describe("HTTP statuses", () => {
  it.each([
    ["rewards/invalid", 400],
    ["rewards/invalid-code", 400],
    ["rewards/not-found", 404],
    ["rewards/code-not-found", 404],
    ["rewards/not-enough-points", 409],
    ["rewards/already-delivered", 409],
    ["rewards/cancelled", 409],
    ["rewards/expired", 409],
    ["rewards/catalog-full", 409],
  ])("maps %s to %i", (code, status) => expect(statusForReceiptError(code)).toBe(status));
});
