import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { StampCard } from "@/modules/stamp-card/domain/entities/stamp-card";
import { StampProgram, STAMP_LIMITS } from "@/modules/stamp-card/domain/value-objects/stamp-program";
import { tableCodeMatches } from "@/modules/stamp-card/domain/ports/table-code-repository";
import { HmacScanTokenSigner } from "@/modules/stamp-card/infrastructure/crypto/hmac-scan-token-signer";
import { newTableCode } from "@/modules/stamp-card/infrastructure/crypto/table-code";
import {
  InMemoryActivityLog,
  InMemoryCustomerDirectory,
  InMemoryStampCardRepository,
  InMemoryStampProgramRepository,
  InMemoryTableCodeRepository,
} from "@/modules/stamp-card/infrastructure/persistence/in-memory-stamp-repositories";
import { ClaimTableStamp } from "@/modules/stamp-card/application/use-cases/claim-table-stamp";
import { GetTableCode, RotateTableCode } from "@/modules/stamp-card/application/use-cases/table-code-use-cases";
import { RecordStamp } from "@/modules/stamp-card/application/use-cases/record-stamp";
import { GetStampCard } from "@/modules/stamp-card/application/use-cases/get-stamp-card";
import { SaveStampProgram } from "@/modules/stamp-card/application/use-cases/stamp-program-use-cases";
import { cardPath, readTableCodeParam, tableQrPath } from "@/lib/stamps/table-qr";
import { statusForStampError } from "@/lib/stamps/http";
import { isMemberPage, requiresPlatformAccess } from "@/lib/auth/route-access";

const T0 = new Date("2026-03-01T12:00:00.000Z");
const minutes = (count: number) => count * 60_000;

const program = (overrides: Partial<Parameters<typeof StampProgram.create>[0]> = {}) => {
  const result = StampProgram.create({ requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 60, tableStamps: true, ...overrides });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("table stamps in the program", () => {
  it("start off, for new and for previously saved programs", () => {
    expect(StampProgram.defaults().tableStamps).toBe(false);
    const saved = StampProgram.create({ requiredStamps: 5, rewardName: "Free coffee", cooldownMinutes: 10 });
    expect(saved.ok && saved.value.tableStamps).toBe(false);
  });

  it("need a longer wait, because a photo of the printed QR works anywhere", () => {
    const short = StampProgram.create({ requiredStamps: 5, rewardName: "Free coffee", cooldownMinutes: STAMP_LIMITS.minTableCooldownMinutes - 1, tableStamps: true });
    expect(!short.ok && short.error.code).toBe("stamps/invalid-program");
    expect(program({ cooldownMinutes: STAMP_LIMITS.minTableCooldownMinutes }).tableStamps).toBe(true);
    // Staff-only programs keep the shorter minimum.
    expect(StampProgram.create({ requiredStamps: 5, rewardName: "Free coffee", cooldownMinutes: STAMP_LIMITS.minCooldownMinutes }).ok).toBe(true);
  });
});

describe("stamp records", () => {
  it("say whether staff or the table QR gave the stamp", () => {
    const empty = StampCard.empty("biz", "u1", T0);
    const byStaff = empty.stamp(program(), "staff-1", T0);
    const byTable = empty.stamp(program(), null, T0);
    expect(byStaff.ok && byStaff.value.stamp).toMatchObject({ source: "staff", staffUserId: "staff-1" });
    expect(byTable.ok && byTable.value.stamp).toMatchObject({ source: "table_qr", staffUserId: null });
  });
});

describe("table codes", () => {
  it("are 16 URL-safe random characters", () => {
    const codes = new Set(Array.from({ length: 50 }, newTableCode));
    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });

  it("match only exactly", () => {
    expect(tableCodeMatches("abcDEF123_-xyz00", "abcDEF123_-xyz00")).toBe(true);
    expect(tableCodeMatches("abcDEF123_-xyz00", "abcDEF123_-xyz01")).toBe(false);
    expect(tableCodeMatches("abcDEF123_-xyz00", "abcDEF123_-xyz0")).toBe(false);
    expect(tableCodeMatches("abcDEF123_-xyz00", "abcDEF123_-xyz000")).toBe(false);
    expect(tableCodeMatches("abcDEF123_-xyz00", "")).toBe(false);
  });

  it("stay the same until the owner replaces them", async () => {
    const codes = new InMemoryTableCodeRepository();
    const first = await new GetTableCode(codes).execute("biz-a");
    const again = await new GetTableCode(codes).execute("biz-a");
    expect(first.ok && again.ok && first.value.code === again.value.code).toBe(true);
    const rotated = await new RotateTableCode(codes).execute("biz-a");
    expect(rotated.ok && first.ok && rotated.value.code !== first.value.code).toBe(true);
    const other = await new GetTableCode(codes).execute("biz-b");
    expect(other.ok && rotated.ok && other.value.code !== rotated.value.code).toBe(true);
  });
});

describe("claiming a stamp with the table QR", () => {
  let now: Date;
  let cards: InMemoryStampCardRepository;
  let programs: InMemoryStampProgramRepository;
  let directory: InMemoryCustomerDirectory;
  let activity: InMemoryActivityLog;
  let codes: InMemoryTableCodeRepository;
  const clock = () => now;
  const signer = new HmacScanTokenSigner("test-secret-".padEnd(48, "x"));

  const claim = (code: string, userId = "user-1", businessId = "biz-a") =>
    new ClaimTableStamp(codes, directory, cards, programs, activity, clock).execute({ businessId, userId, code });
  const codeOf = async (businessId = "biz-a") => (await codes.current(businessId)).code;
  const advance = (count: number) => {
    now = new Date(now.getTime() + minutes(count));
  };

  beforeEach(async () => {
    now = new Date(T0);
    cards = new InMemoryStampCardRepository();
    programs = new InMemoryStampProgramRepository();
    directory = new InMemoryCustomerDirectory();
    activity = new InMemoryActivityLog();
    codes = new InMemoryTableCodeRepository();
    directory.add("biz-a", "user-1", "Ana");
    directory.add("biz-a", "user-2", "Luis");
    directory.add("biz-b", "user-1", "Ana");
    await programs.save("biz-a", program());
    await programs.save("biz-b", program());
  });

  it("stamps the customer's own card, marked as a table stamp with no employee", async () => {
    const result = await claim(await codeOf());
    expect(result.ok && result.value.card).toMatchObject({ stamps: 1, canStamp: false, tableStamps: true });
    expect(cards.stamps).toEqual([expect.objectContaining({ userId: "user-1", source: "table_qr", staffUserId: null })]);
    expect(activity.entries).toEqual([expect.objectContaining({ type: "stamp_added", data: expect.objectContaining({ source: "table_qr" }) })]);
  });

  it("does nothing while the owner has not turned it on", async () => {
    await programs.save("biz-a", program({ tableStamps: false }));
    const result = await claim(await codeOf());
    expect(!result.ok && result.error.code).toBe("stamps/table-disabled");
    expect(cards.stamps).toHaveLength(0);
  });

  it("refuses a wrong code, a code from another business and a replaced code", async () => {
    expect((await claim("not-the-code")).ok).toBe(false);
    const fromB = await claim(await codeOf("biz-b"));
    expect(!fromB.ok && fromB.error.code).toBe("stamps/invalid-table-code");

    const old = await codeOf();
    await codes.rotate("biz-a");
    const replaced = await claim(old);
    expect(!replaced.ok && replaced.error.code).toBe("stamps/invalid-table-code");
    expect((await claim(await codeOf())).ok).toBe(true);
    expect(cards.stamps).toHaveLength(1);
  });

  it("refuses someone who never joined the business", async () => {
    const result = await claim(await codeOf(), "stranger");
    expect(!result.ok && result.error.code).toBe("stamps/not-a-customer");
  });

  it("gives one stamp per visit however many times the QR is scanned", async () => {
    const code = await codeOf();
    expect((await claim(code)).ok).toBe(true);
    advance(30);
    const again = await claim(code);
    expect(!again.ok && again.error.code).toBe("stamps/too-soon");
    advance(30);
    expect((await claim(code)).ok).toBe(true);
    expect(cards.stamps).toHaveLength(2);
  });

  it("adds one stamp when many claims arrive at the same instant", async () => {
    const code = await codeOf();
    const results = await Promise.all(Array.from({ length: 8 }, () => claim(code)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(cards.stamps).toHaveLength(1);
  });

  it("shares the wait with staff stamps, so one visit never earns two", async () => {
    expect((await claim(await codeOf())).ok).toBe(true);
    const token = signer.sign({ businessId: "biz-a", userId: "user-1" }, now).token;
    const byStaff = await new RecordStamp(signer, directory, cards, programs, activity, clock).execute({ businessId: "biz-a", token, staffUserId: "staff-1" });
    expect(!byStaff.ok && byStaff.error.code).toBe("stamps/too-soon");
  });

  it("keeps each customer's wait separate", async () => {
    const code = await codeOf();
    expect((await claim(code, "user-1")).ok).toBe(true);
    expect((await claim(code, "user-2")).ok).toBe(true);
  });

  it("unlocks the reward and then stops until staff redeem it", async () => {
    const code = await codeOf();
    for (let visit = 0; visit < 3; visit++) {
      const result = await claim(code);
      expect(result.ok).toBe(true);
      if (visit === 2) expect(result.ok && result.value.rewardUnlocked).toBe(true);
      advance(60);
    }
    const blocked = await claim(code);
    expect(!blocked.ok && blocked.error.code).toBe("stamps/reward-pending");
    expect(activity.entries.filter((entry) => entry.type === "reward_unlocked")).toHaveLength(1);
  });

  it("refuses stamps while the program is paused", async () => {
    await programs.save("biz-a", program({ active: false }));
    const result = await claim(await codeOf());
    expect(!result.ok && result.error.code).toBe("stamps/inactive");
  });

  it("tells the card screen whether to offer the button", async () => {
    const view = await new GetStampCard(cards, programs, directory, clock).execute({ businessId: "biz-a", userId: "user-1" });
    expect(view.ok && view.value.tableStamps).toBe(true);
    await new SaveStampProgram(programs).execute({ businessId: "biz-a", requiredStamps: 3, rewardName: "Free coffee", cooldownMinutes: 60 });
    const off = await new GetStampCard(cards, programs, directory, clock).execute({ businessId: "biz-a", userId: "user-1" });
    expect(off.ok && off.value.tableStamps).toBe(false);
  });
});

describe("table QR addresses", () => {
  it("forward only well-formed codes", () => {
    expect(readTableCodeParam("abcDEF123_-xyz00")).toBe("abcDEF123_-xyz00");
    expect(readTableCodeParam(["first-code", "second"])).toBe("first-code");
    expect(readTableCodeParam(undefined)).toBeNull();
    expect(readTableCodeParam("")).toBeNull();
    expect(readTableCodeParam("a/b")).toBeNull();
    expect(readTableCodeParam("x".repeat(65))).toBeNull();
    expect(readTableCodeParam("<script>")).toBeNull();
  });

  it("lead from the table to signup, and on to the card with the code", () => {
    expect(tableQrPath("cafe-luna", "abc")).toBe("/b/cafe-luna?source=table_qr&t=abc");
    expect(cardPath("cafe-luna", "abc")).toBe("/me/cards/cafe-luna?t=abc");
    expect(cardPath("cafe-luna", null)).toBe("/me/cards/cafe-luna");
  });

  it("put the printable QR page behind the business membership, not the platform", () => {
    expect(isMemberPage("/biz/cafe-luna/qr")).toBe(true);
    expect(requiresPlatformAccess("/biz/cafe-luna/qr")).toBe(false);
  });

  it("answer a disabled table stamp as a conflict", () => {
    expect(statusForStampError("stamps/table-disabled")).toBe(409);
    expect(statusForStampError("stamps/invalid-table-code")).toBe(400);
  });
});
