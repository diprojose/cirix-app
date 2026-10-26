import { beforeEach, describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { StampCard } from "@/modules/stamp-card/domain/entities/stamp-card";
import { StampProgram, STAMP_LIMITS } from "@/modules/stamp-card/domain/value-objects/stamp-program";
import { StampTooSoonError, ScanSecretMisconfiguredError } from "@/modules/stamp-card/domain/errors/stamp-card-errors";
import { HmacScanTokenSigner, SCAN_TOKEN_TTL_SECONDS } from "@/modules/stamp-card/infrastructure/crypto/hmac-scan-token-signer";
import {
  InMemoryActivityLog,
  InMemoryCustomerDirectory,
  InMemoryStampCardRepository,
  InMemoryStampProgramRepository,
} from "@/modules/stamp-card/infrastructure/persistence/in-memory-stamp-repositories";
import { GetStampCard } from "@/modules/stamp-card/application/use-cases/get-stamp-card";
import { IssueScanToken } from "@/modules/stamp-card/application/use-cases/issue-scan-token";
import { PreviewScan } from "@/modules/stamp-card/application/use-cases/preview-scan";
import { RecordStamp } from "@/modules/stamp-card/application/use-cases/record-stamp";
import { RedeemReward } from "@/modules/stamp-card/application/use-cases/redeem-reward";
import { GetStampProgram, SaveStampProgram } from "@/modules/stamp-card/application/use-cases/stamp-program-use-cases";

const SECRET = "test-secret-".padEnd(48, "x");
const T0 = new Date("2026-03-01T12:00:00.000Z");
const minutes = (count: number) => count * 60_000;

const program = (overrides: Partial<Parameters<typeof StampProgram.create>[0]> = {}) => {
  const result = StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 10, ...overrides });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("stamp program", () => {
  it("offers sensible defaults", () => {
    const defaults = StampProgram.defaults();
    expect([defaults.requiredStamps, defaults.cooldownMinutes, defaults.active]).toEqual([10, 240, true]);
  });

  it("normalizes the reward name", () => {
    expect(program({ rewardName: "  Free    coffee " }).rewardName).toBe("Free coffee");
  });

  it.each([
    ["too few stamps", { requiredStamps: STAMP_LIMITS.minStamps - 1 }],
    ["too many stamps", { requiredStamps: STAMP_LIMITS.maxStamps + 1 }],
    ["fractional stamps", { requiredStamps: 5.5 }],
    ["a one-letter reward", { rewardName: "a" }],
    ["a reward name that is too long", { rewardName: "x".repeat(61) }],
    ["a cooldown shorter than a scan code lives", { cooldownMinutes: STAMP_LIMITS.minCooldownMinutes - 1 }],
    ["a cooldown over a day", { cooldownMinutes: STAMP_LIMITS.maxCooldownMinutes + 1 }],
    ["a fractional cooldown", { cooldownMinutes: 10.5 }],
  ])("rejects %s", (_label, overrides) => {
    expect(StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 10, ...overrides }).ok).toBe(false);
  });

  it("keeps the minimum cooldown above the scan code lifetime", () => {
    // This is what makes a screenshot or double scan unable to add a second stamp.
    expect(STAMP_LIMITS.minCooldownMinutes * 60).toBeGreaterThan(SCAN_TOKEN_TTL_SECONDS);
  });
});

describe("stamp card rules", () => {
  const stampAt = (card: StampCard, at: Date, p = program()) => {
    const result = card.stamp(p, "staff-1", at);
    if (!result.ok) throw new Error(result.error.code);
    return result.value;
  };

  it("adds a first stamp with its record", () => {
    const { card, stamp, rewardUnlocked } = stampAt(StampCard.empty("biz", "u1", T0), T0);
    expect([card.stamps, card.totalStamps, rewardUnlocked]).toEqual([1, 1, false]);
    expect(stamp).toMatchObject({ businessId: "biz", userId: "u1", staffUserId: "staff-1", sequence: 1 });
    expect(stamp.at).toBe(T0.toISOString());
  });

  it("does not change the card it was called on", () => {
    const original = StampCard.empty("biz", "u1", T0);
    stampAt(original, T0);
    expect(original.stamps).toBe(0);
    expect(original.lastStampAt).toBeNull();
  });

  it("refuses a second stamp inside the cooldown and says how long to wait", () => {
    const first = stampAt(StampCard.empty("biz", "u1", T0), T0).card;
    const early = first.stamp(program(), "staff-1", new Date(T0.getTime() + minutes(10) - 1000));
    expect(!early.ok && early.error).toBeInstanceOf(StampTooSoonError);
    expect(!early.ok && (early.error as StampTooSoonError).retryAfterSeconds).toBe(1);

    const instant = first.stamp(program(), "staff-1", T0);
    expect(!instant.ok && (instant.error as StampTooSoonError).retryAfterSeconds).toBe(600);
  });

  it("allows the next stamp exactly when the cooldown ends", () => {
    const first = stampAt(StampCard.empty("biz", "u1", T0), T0).card;
    expect(first.stamp(program(), "staff-1", new Date(T0.getTime() + minutes(10))).ok).toBe(true);
  });

  it("unlocks the reward on the last stamp and blocks further stamps until redeemed", () => {
    let at = T0;
    let card = StampCard.empty("biz", "u1", T0);
    const outcomes: boolean[] = [];
    for (let index = 0; index < 3; index += 1) {
      const change = stampAt(card, at);
      card = change.card;
      outcomes.push(change.rewardUnlocked);
      at = new Date(at.getTime() + minutes(10));
    }
    expect(outcomes).toEqual([false, false, true]);
    expect([card.stamps, card.rewardReady, card.totalStamps]).toEqual([3, true, 3]);

    const blocked = card.stamp(program(), "staff-1", at);
    expect(!blocked.ok && blocked.error.code).toBe("stamps/reward-pending");
  });

  it("restarts the cycle at zero on redeem and keeps the cooldown running", () => {
    let card = StampCard.empty("biz", "u1", T0);
    let at = T0;
    for (let index = 0; index < 3; index += 1) {
      card = stampAt(card, at).card;
      at = new Date(at.getTime() + minutes(10));
    }
    const redeemed = card.redeem(program(), "staff-2", at);
    expect(redeemed.ok).toBe(true);
    if (!redeemed.ok) return;
    expect([redeemed.value.card.stamps, redeemed.value.card.rewardReady, redeemed.value.card.redeemedCount]).toEqual([0, false, 1]);
    expect(redeemed.value.card.totalStamps).toBe(3);
    expect(redeemed.value.redemption).toMatchObject({ staffUserId: "staff-2", userId: "u1" });

    // The same visit cannot immediately start the next cycle...
    const sameVisit = redeemed.value.card.stamp(program(), "staff-1", new Date(card.lastStampAt!));
    expect(sameVisit.ok).toBe(false);
    // ...but a later visit can.
    expect(redeemed.value.card.stamp(program(), "staff-1", new Date(at.getTime() + minutes(10))).ok).toBe(true);
  });

  it("refuses to redeem when no reward is waiting", () => {
    const result = StampCard.empty("biz", "u1", T0).redeem(program(), "staff-1", T0);
    expect(!result.ok && result.error.code).toBe("stamps/no-reward");
  });

  it("counts a card as complete when the owner lowers the target below its stamps", () => {
    let card = StampCard.empty("biz", "u1", T0);
    const tenStamps = program({ requiredStamps: 10 });
    let at = T0;
    for (let index = 0; index < 5; index += 1) {
      card = stampAt(card, at, tenStamps).card;
      at = new Date(at.getTime() + minutes(10));
    }
    const lowered = program({ requiredStamps: 3 });
    expect(card.isRewardReady(lowered)).toBe(true);
    expect(card.displayStamps(lowered)).toBe(3);
    expect(card.stamp(lowered, "staff-1", at).ok).toBe(false);
    expect(card.redeem(lowered, "staff-1", at).ok).toBe(true);
  });

  it("refuses stamps while the program is paused", () => {
    const paused = program({ active: false });
    const result = StampCard.empty("biz", "u1", T0).stamp(paused, "staff-1", T0);
    expect(!result.ok && result.error.code).toBe("stamps/inactive");
    expect(StampCard.empty("biz", "u1", T0).status(paused, T0).canStamp).toBe(false);
  });

  it("reports what staff may do", () => {
    const fresh = StampCard.empty("biz", "u1", T0);
    expect(fresh.status(program(), T0)).toEqual({ canStamp: true, canRedeem: false, retryAfterSeconds: 0 });
    const stamped = stampAt(fresh, T0).card;
    expect(stamped.status(program(), T0)).toEqual({ canStamp: false, canRedeem: false, retryAfterSeconds: 600 });
  });

  it.each([
    ["negative stamps", { stamps: -1 }],
    ["fractional totals", { totalStamps: 1.5 }],
    ["more cycle stamps than the whole history", { stamps: 5, totalStamps: 2 }],
  ])("refuses to restore %s", (_label, overrides) => {
    const base = { businessId: "b", userId: "u", stamps: 1, rewardReady: false, totalStamps: 1, redeemedCount: 0, lastStampAt: null, createdAt: "", updatedAt: "" };
    expect(StampCard.restore({ ...base, ...overrides }).ok).toBe(false);
  });
});

describe("scan token signer", () => {
  const signer = new HmacScanTokenSigner(SECRET);
  const subject = { businessId: "biz-a", userId: "user-1" };

  it("round-trips the subject and expires in 90 seconds", () => {
    const issued = signer.sign(subject, T0);
    expect(issued.expiresAt).toBe(new Date(T0.getTime() + 90_000).toISOString());
    const verified = signer.verify(issued.token, new Date(T0.getTime() + 89_000));
    expect(verified.ok && verified.value).toEqual(subject);
  });

  it("expires exactly at its deadline, and says so", () => {
    const { token } = signer.sign(subject, T0);
    const late = signer.verify(token, new Date(T0.getTime() + 90_000));
    expect(!late.ok && late.error.code).toBe("stamps/expired-token");
  });

  it("rejects a forged payload, a forged signature and another secret", () => {
    const { token } = signer.sign(subject, T0);
    const [version, payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ b: "biz-a", u: "someone-else", e: 9_999_999_999 })).toString("base64url");
    const other = new HmacScanTokenSigner("another-secret-".padEnd(48, "y")).sign(subject, T0).token;
    for (const bad of [
      `${version}.${forged}.${signature}`,
      `${version}.${payload}.${signature.slice(0, -2)}AA`,
      `${version}.${payload}.`,
      other,
    ]) {
      const result = signer.verify(bad, T0);
      expect(!result.ok && result.error.code, bad.slice(0, 30)).toBe("stamps/invalid-token");
    }
  });

  it.each(["", "garbage", "v1.only-two", "v2.a.b", "v1.a.b.c", "a".repeat(601), "v1..", "....."])(
    "rejects the malformed code %j",
    (bad) => {
      const result = signer.verify(bad, T0);
      expect(!result.ok && result.error.code).toBe("stamps/invalid-token");
    }
  );

  it("rejects non-string input without throwing", () => {
    expect(signer.verify(undefined as unknown as string, T0).ok).toBe(false);
    expect(signer.verify(42 as unknown as string, T0).ok).toBe(false);
  });

  it("refuses to run with a short secret", () => {
    expect(() => new HmacScanTokenSigner("short")).toThrow(ScanSecretMisconfiguredError);
    expect(() => new HmacScanTokenSigner("")).toThrow(ScanSecretMisconfiguredError);
  });

  it("produces a code that a phone camera can actually read", () => {
    // Guards the real constraint: the token must fit a QR that jsQR decodes.
    const { token } = signer.sign({ businessId: crypto.randomUUID(), userId: "x".repeat(28) }, T0);
    const qr = QRCode.create(token, { errorCorrectionLevel: "M" });
    const { size, data } = qr.modules;
    const scale = 6;
    const quiet = 4;
    const width = (size + quiet * 2) * scale;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (!data[row * size + col]) continue;
        for (let y = 0; y < scale; y += 1) {
          for (let x = 0; x < scale; x += 1) {
            const offset = (((row + quiet) * scale + y) * width + (col + quiet) * scale + x) * 4;
            pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
          }
        }
      }
    }
    expect(jsQR(pixels, width, width)?.data).toBe(token);
    // And it stays a small, easily scanned code.
    expect(qr.version).toBeLessThanOrEqual(12);
  });
});

describe("stamp flows", () => {
  let now: Date;
  let cards: InMemoryStampCardRepository;
  let programs: InMemoryStampProgramRepository;
  let directory: InMemoryCustomerDirectory;
  let activity: InMemoryActivityLog;
  const signer = new HmacScanTokenSigner(SECRET);
  const clock = () => now;

  const issue = (businessId = "biz-a", userId = "user-1") => signer.sign({ businessId, userId }, now).token;
  const stamp = (token: string, staffUserId = "staff-1", businessId = "biz-a") =>
    new RecordStamp(signer, directory, cards, programs, activity, clock).execute({ businessId, token, staffUserId });
  const redeem = (token: string, staffUserId = "staff-1", businessId = "biz-a") =>
    new RedeemReward(signer, directory, cards, programs, activity, clock).execute({ businessId, token, staffUserId });
  const preview = (token: string, businessId = "biz-a") =>
    new PreviewScan(signer, directory, cards, programs, clock).execute({ businessId, token });
  const advance = (count: number) => {
    now = new Date(now.getTime() + minutes(count));
  };

  beforeEach(async () => {
    now = new Date(T0);
    cards = new InMemoryStampCardRepository();
    programs = new InMemoryStampProgramRepository();
    directory = new InMemoryCustomerDirectory();
    activity = new InMemoryActivityLog();
    directory.add("biz-a", "user-1", "Ana");
    directory.add("biz-a", "user-2", "Luis");
    directory.add("biz-b", "user-1", "Ana");
    await programs.save("biz-a", program());
  });

  describe("reading the card", () => {
    it("shows a customer an empty card without any setup", async () => {
      const result = await new GetStampCard(cards, programs, directory, clock).execute({ businessId: "biz-a", userId: "user-1" });
      expect(result.ok && result.value).toMatchObject({ stamps: 0, required: 3, rewardName: "Free coffee", rewardReady: false, canStamp: true });
    });

    it("refuses someone who never joined the business", async () => {
      const result = await new GetStampCard(cards, programs, directory, clock).execute({ businessId: "biz-a", userId: "stranger" });
      expect(!result.ok && result.error.code).toBe("stamps/not-a-customer");
    });

    it("issues a code only to customers, for themselves", async () => {
      const issuer = new IssueScanToken(signer, directory, clock);
      const customer = await issuer.execute({ businessId: "biz-a", userId: "user-1" });
      expect(customer.ok).toBe(true);
      if (customer.ok) {
        const verified = signer.verify(customer.value.token, now);
        expect(verified.ok && verified.value).toEqual({ businessId: "biz-a", userId: "user-1" });
      }
      const stranger = await issuer.execute({ businessId: "biz-a", userId: "stranger" });
      expect(!stranger.ok && stranger.error.code).toBe("stamps/not-a-customer");
    });
  });

  describe("previewing a scan", () => {
    it("shows the first name and what staff can do, and writes nothing", async () => {
      const result = await preview(issue());
      expect(result.ok && result.value.firstName).toBe("Ana");
      expect(result.ok && result.value.card).toMatchObject({ stamps: 0, canStamp: true, canRedeem: false });
      expect(cards.stamps).toHaveLength(0);
      expect(activity.entries).toHaveLength(0);
    });

    it("shows how long to wait after a stamp", async () => {
      await stamp(issue());
      const result = await preview(issue());
      expect(result.ok && result.value.card).toMatchObject({ canStamp: false, retryAfterSeconds: 600, stamps: 1 });
    });

    it("never reveals more than the first name", async () => {
      directory.add("biz-a", "user-3", "María");
      const result = await preview(issue("biz-a", "user-3"));
      expect(result.ok && Object.keys(result.value).sort()).toEqual(["card", "firstName"]);
    });
  });

  describe("recording a stamp", () => {
    it("stamps the card, records who gave it and reports the timeline", async () => {
      const result = await stamp(issue(), "staff-9");
      expect(result.ok && result.value).toMatchObject({ firstName: "Ana", rewardUnlocked: false, card: { stamps: 1 } });
      expect(cards.stamps).toEqual([expect.objectContaining({ staffUserId: "staff-9", userId: "user-1", sequence: 1 })]);
      expect(activity.entries.map((entry) => entry.type)).toEqual(["stamp_added"]);
    });

    it("keeps the stamp even when the timeline is unavailable", async () => {
      activity.failing = true;
      const result = await stamp(issue());
      expect(result.ok).toBe(true);
      expect((await cards.find("biz-a", "user-1"))?.stamps).toBe(1);
    });

    it("refuses a code made for another business, exactly like a forged one", async () => {
      const result = await stamp(issue("biz-b", "user-1"), "staff-1", "biz-a");
      expect(!result.ok && result.error.code).toBe("stamps/invalid-token");
      expect(cards.stamps).toHaveLength(0);
      expect(await cards.find("biz-a", "user-1")).toBeNull();
    });

    it("refuses an expired code and a forged one", async () => {
      const token = issue();
      advance(2);
      const expired = await stamp(token);
      expect(!expired.ok && expired.error.code).toBe("stamps/expired-token");
      const forged = await stamp(`${token.slice(0, -3)}abc`);
      expect(!forged.ok && forged.error.code).toBe("stamps/invalid-token");
      expect(cards.stamps).toHaveLength(0);
    });

    it("refuses a code whose owner is not a customer of the business", async () => {
      const result = await stamp(issue("biz-a", "ghost"));
      expect(!result.ok && result.error.code).toBe("stamps/not-a-customer");
    });

    it("adds only one stamp when the same code is scanned twice", async () => {
      const token = issue();
      expect((await stamp(token)).ok).toBe(true);
      const second = await stamp(token);
      expect(!second.ok && second.error.code).toBe("stamps/too-soon");
      expect(cards.stamps).toHaveLength(1);
    });

    it("adds only one stamp when many scans arrive at the same instant", async () => {
      const token = issue();
      const results = await Promise.all(Array.from({ length: 8 }, () => stamp(token)));
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok && result.error.code === "stamps/too-soon")).toHaveLength(7);
      expect(cards.stamps).toHaveLength(1);
    });

    it("adds only one stamp when two employees scan at once", async () => {
      const results = await Promise.all([stamp(issue(), "staff-1"), stamp(issue(), "staff-2")]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
    });

    it("keeps one customer's cooldown from affecting another", async () => {
      await stamp(issue("biz-a", "user-1"));
      const other = await stamp(issue("biz-a", "user-2"));
      expect(other.ok).toBe(true);
    });

    it("keeps cards separate between businesses", async () => {
      await programs.save("biz-b", program());
      await stamp(issue("biz-a", "user-1"));
      const inB = await stamp(issue("biz-b", "user-1"), "staff-1", "biz-b");
      expect(inB.ok && inB.value.card.stamps).toBe(1);
      expect((await cards.find("biz-a", "user-1"))?.stamps).toBe(1);
    });

    it("refuses stamps while the business paused its program", async () => {
      await programs.save("biz-a", program({ active: false }));
      const result = await stamp(issue());
      expect(!result.ok && result.error.code).toBe("stamps/inactive");
    });
  });

  describe("a full card", () => {
    const completeCard = async () => {
      for (let index = 0; index < 3; index += 1) {
        const result = await stamp(issue());
        expect(result.ok, `stamp ${index + 1}`).toBe(true);
        advance(10);
      }
    };

    it("unlocks the reward, blocks stamps, redeems once and starts over", async () => {
      await stamp(issue());
      advance(10);
      await stamp(issue());
      advance(10);
      const last = await stamp(issue());
      expect(last.ok && last.value.rewardUnlocked).toBe(true);
      expect(last.ok && last.value.card).toMatchObject({ stamps: 3, rewardReady: true, canRedeem: true });
      expect(activity.entries.map((entry) => entry.type)).toEqual(["stamp_added", "stamp_added", "stamp_added", "reward_unlocked"]);

      advance(10);
      const blocked = await stamp(issue());
      expect(!blocked.ok && blocked.error.code).toBe("stamps/reward-pending");

      const redeemed = await redeem(issue(), "staff-2");
      expect(redeemed.ok && redeemed.value.card).toMatchObject({ stamps: 0, rewardReady: false, redeemedCount: 1 });
      expect(cards.redemptions).toEqual([expect.objectContaining({ staffUserId: "staff-2", userId: "user-1" })]);
      expect(activity.entries.at(-1)?.type).toBe("reward_redeemed");

      const again = await stamp(issue());
      expect(again.ok && again.value.card.stamps).toBe(1);
    });

    it("never gives two rewards for one card, even with a double tap", async () => {
      await completeCard();
      const token = issue();
      const results = await Promise.all([redeem(token), redeem(token), redeem(token)]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok && result.error.code === "stamps/no-reward")).toHaveLength(2);
      expect(cards.redemptions).toHaveLength(1);
    });

    it("cannot redeem a card that never collected anything", async () => {
      const result = await redeem(issue());
      expect(!result.ok && result.error.code).toBe("stamps/no-reward");
    });

    it("cannot redeem with a code from another business", async () => {
      await completeCard();
      const result = await redeem(issue("biz-b", "user-1"), "staff-1", "biz-a");
      expect(!result.ok && result.error.code).toBe("stamps/invalid-token");
      expect(cards.redemptions).toHaveLength(0);
    });

    it("shows redeem as available in the preview", async () => {
      await completeCard();
      const result = await preview(issue());
      expect(result.ok && result.value.card).toMatchObject({ rewardReady: true, canRedeem: true, canStamp: false });
    });
  });

  describe("the program", () => {
    it("reads the defaults for a business that never configured one", async () => {
      const result = await new GetStampProgram(programs).execute("brand-new");
      expect(result.ok && result.value).toMatchObject({ requiredStamps: 10, cooldownMinutes: 240, active: true });
    });

    it("saves valid rules and refuses invalid ones without changing anything", async () => {
      const saver = new SaveStampProgram(programs);
      const good = await saver.execute({ businessId: "biz-a", requiredStamps: 8, rewardName: "Free dessert", cooldownMinutes: 120 });
      expect(good.ok && good.value).toMatchObject({ requiredStamps: 8, rewardName: "Free dessert" });

      const bad = await saver.execute({ businessId: "biz-a", requiredStamps: 1, rewardName: "x", cooldownMinutes: 1 });
      expect(!bad.ok && bad.error.code).toBe("stamps/invalid-program");
      expect((await programs.get("biz-a")).requiredStamps).toBe(8);
    });

    it("lets a lowered target complete cards already in progress", async () => {
      await programs.save("biz-a", program({ requiredStamps: 10 }));
      await stamp(issue());
      advance(10);
      await stamp(issue());
      await new SaveStampProgram(programs).execute({ businessId: "biz-a", requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 10 });
      const view = await new GetStampCard(cards, programs, directory, clock).execute({ businessId: "biz-a", userId: "user-1" });
      expect(view.ok && view.value.stamps).toBe(2);
      advance(10);
      const next = await stamp(issue());
      expect(next.ok && next.value.rewardUnlocked).toBe(true);
    });
  });
});
