import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

import { err, ok } from "@/shared/domain/result";
import { StampCard } from "@/modules/stamp-card/domain/entities/stamp-card";
import { StampProgram } from "@/modules/stamp-card/domain/value-objects/stamp-program";
import { GrantReceiptStamp } from "@/modules/stamp-card/application/use-cases/grant-receipt-stamp";
import { GetStampActivity } from "@/modules/stamp-card/application/use-cases/owner-reports";
import {
  InMemoryStampCardRepository,
  InMemoryStampProgramRepository,
} from "@/modules/stamp-card/infrastructure/persistence/in-memory-stamp-repositories";
import { PointsAccount } from "@/modules/receipts/domain/entities/points-account";
import { ReceiptDailyLimitError } from "@/modules/receipts/domain/errors/receipt-errors";
import type { ReceiptReader, StampRewards } from "@/modules/receipts/domain/ports/receipt-ports";
import { parseReceipt } from "@/modules/receipts/domain/services/parse-receipt";
import { verifyReceipt } from "@/modules/receipts/domain/services/verify-receipt";
import { ReceiptSettings, type ReceiptSettingsInput } from "@/modules/receipts/domain/value-objects/receipt-settings";
import { MAX_ATTEMPTS_PER_DAY, ScanReceipt } from "@/modules/receipts/application/use-cases/scan-receipt";
import { GetPointsSummary, ListPointsBalances, ListRecentReceipts } from "@/modules/receipts/application/use-cases/receipt-queries";
import {
  InMemoryPointsRepository,
  InMemoryReceiptLedger,
  InMemoryReceiptSettingsRepository,
} from "@/modules/receipts/infrastructure/persistence/in-memory-receipt-repositories";
import { TesseractReceiptReader } from "@/modules/receipts/infrastructure/ocr/tesseract-receipt-reader";
import { statusForReceiptError } from "@/lib/receipts/http";
import { isMemberPage } from "@/lib/auth/route-access";

/** What Tesseract really produced from a supermarket slip, with its mistakes and identifiers changed. */
const SUPERMARKET = `Bravo Supermarket
3853 cleveland Ave
Fort Myers, FL 33901
Tel: (239) 789-1923
Qty Description Price
1 NESTLE COCOSSETE / NEST 0.99 7
1 GROCERY 1.00 F
Number of Item(s) 3
SUBTOTAL 2.98
TAX]: 0,13
TOTAL: $3.11
CREDIT CARD : 3.11
YOUR CHANGE : $0.00
Monday Thru saturday : 7:30am-9pm
Refunds only w/original Receipt
Limited to 48hr for any returns
CLERK 05 SONMY REG-RO1 Vv47, 385
TRX# 015987 2:41pm-sun 11/01/26
Trx Response : APPROVED
Trx Type : sale
AMOUNT $3.11
TOTAL : $3.11
Merchant ID : 999930525877809
Terminal 1D © SHS565
Batch Nbr : 202611010001
Authorization : 04266Q
Retain This Receipt`;

/** The same slip read worse: a real first pass on the unprocessed image. */
const SUPERMARKET_POOR_READ = `sravo supermarket
3853 cleveland Ave
SUBTOTAL 2.98
TAXL: 0.13
TOTAL: $3.11
CREDIT CARD : ER
TRX# 015987 2:41pM-sun 11/01/26
Tex Type : sale
AMOUNT : $3.11
TOTAL : $3.11
Merchant 10: 999930525877809
Authorization : 04266Q`;

const RESTAURANT = `CAFE LUNA
Av. Bolivar 123
Fecha: 05/11/2026 Hora: 19:42
Factura No. 000123
Subtotal 18,50
IVA 1,50
TOTAL A PAGAR 20,00
Efectivo 25,00`;

const BIZ = { id: "biz-1", name: "Bravo Supermarket", kind: "supermarket" };
const CAFE = { id: "biz-2", name: "Cafe Luna", kind: "restaurant" };
const NOW = new Date("2026-11-02T15:00:00.000Z");

const settings = (overrides: Partial<ReceiptSettingsInput> = {}) => {
  const result = ReceiptSettings.create({
    enabled: true,
    storeNames: [],
    merchantIds: [],
    maxAgeDays: 2,
    maxAmountDollars: 500,
    pointsPerDollar: 2,
    dailyLimit: 3,
    ...overrides,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("reading a receipt's text", () => {
  it("finds what matters on a real slip, despite OCR mistakes", () => {
    const parsed = parseReceipt(SUPERMARKET);
    expect(parsed.totalCents).toBe(311);
    expect(parsed.totalConfirmed).toBe(true);
    expect(parsed.transactionId).toBe("015987");
    expect(parsed.authCode).toBe("04266Q");
    expect(parsed.merchantId).toBe("999930525877809");
    expect(parsed.time).toBe("14:41");
    expect(parsed.dates).toContain("2026-11-01");
  });

  it("copes with a poor read of the same slip", () => {
    const parsed = parseReceipt(SUPERMARKET_POOR_READ);
    expect(parsed.totalCents).toBe(311);
    expect(parsed.merchantId).toBe("999930525877809");
    expect(parsed.transactionId).toBe("015987");
  });

  it("reads Spanish receipts with a decimal comma and a year-long date", () => {
    const parsed = parseReceipt(RESTAURANT);
    expect(parsed.totalCents).toBe(2000);
    expect(parsed.totalConfirmed).toBe(true);
    expect(parsed.transactionId).toBe("000123");
    expect(parsed.dates).toEqual(expect.arrayContaining(["2026-11-05", "2026-05-11"]));
    expect(parsed.time).toBe("19:42");
  });

  it("does not take the subtotal, the tax, or the number of items for the total", () => {
    expect(parseReceipt("SUBTOTAL 9.00\nTAX 1.00\nTOTAL ITEMS 12.00").totalCents).toBeNull();
    expect(parseReceipt("TOTAL TAX 1.00\nTOTAL 10.00").totalCents).toBe(1000);
  });

  it("handles thousands and a total on its own line", () => {
    expect(parseReceipt("TOTAL\n$1,234.56").totalCents).toBe(123456);
    expect(parseReceipt("TOTAL 1.234,56").totalCents).toBe(123456);
  });

  it("lets repeated totals outvote a misread one", () => {
    expect(parseReceipt("TOTAL 311.00\nTOTAL 3.11\nTOTAL 3.11").totalCents).toBe(311);
  });

  it("takes opening hours for neither the visit's time nor a date", () => {
    const parsed = parseReceipt("Monday: 7:30am-9pm\nTOTAL 1.00");
    expect(parsed.time).toBeNull();
    expect(parsed.dates).toEqual([]);
  });

  it("reads through whatever OCR made of the separator", () => {
    const parsed = parseReceipt("Merchant ID © 999930525877809\nAuthorization ~ 04266Q\nTRX ; 015987");
    expect(parsed.merchantId).toBe("999930525877809");
    expect(parsed.authCode).toBe("04266Q");
    expect(parsed.transactionId).toBe("015987");
  });

  it("does not take labels with no number for identifiers", () => {
    const parsed = parseReceipt("Trx Response : APPROVED\nTrx Type : sale\nRefunds only w/original Receipt");
    expect(parsed.transactionId).toBeNull();
    expect(parsed.authCode).toBeNull();
  });

  it("never picks up the card number", () => {
    const parsed = parseReceipt(`${SUPERMARKET}\nCard # : ********1750`);
    expect(JSON.stringify({ ...parsed, lines: [] })).not.toContain("1750");
  });
});

describe("deciding whether a receipt counts", () => {
  const verify = (text: string, rules = settings(), name = BIZ.name, now = NOW) => verifyReceipt(parseReceipt(text), rules, name, now);
  const codeOf = (result: ReturnType<typeof verify>) => (result.ok ? "ok" : result.error.code);

  it("accepts a slip from this business", () => {
    const result = verify(SUPERMARKET);
    expect(result.ok && result.value).toMatchObject({ totalCents: 311, date: "2026-11-01", transactionId: "015987" });
  });

  it("recognizes the store through an OCR mistake in its name", () => {
    expect(codeOf(verify(SUPERMARKET_POOR_READ))).toBe("ok");
  });

  it("refuses a receipt from another store", () => {
    expect(codeOf(verify(SUPERMARKET, settings(), "Publix"))).toBe("receipts/wrong-store");
    expect(codeOf(verify(SUPERMARKET, settings({ storeNames: ["Sedano's Market"] })))).toBe("receipts/wrong-store");
  });

  it("does not allow OCR mistakes on very short names", () => {
    expect(codeOf(verify("KFD\nTOTAL 1.00\nTRX# 12345 11/01/26", settings(), "KFC"))).toBe("receipts/wrong-store");
  });

  it("accepts the address the owner gave, for a logo the OCR cannot read", () => {
    expect(codeOf(verify(SUPERMARKET, settings({ storeNames: ["3853 Cleveland Ave"] }), "Another name"))).toBe("ok");
  });

  it("trusts the Merchant ID over the name, in both directions", () => {
    expect(codeOf(verify(SUPERMARKET, settings({ merchantIds: ["999930525877809"] }), "Another name"))).toBe("ok");
    expect(codeOf(verify(SUPERMARKET, settings({ merchantIds: ["111111111"] })))).toBe("receipts/wrong-store");
  });

  it("matches a Merchant ID the slip masks down to its last digits", () => {
    const masked = "TOTAL 5.00\nTRX# 12345 11/01/26\nMerchant ID: ****7809";
    expect(codeOf(verify(masked, settings({ merchantIds: ["999930525877809"] }), "x"))).toBe("ok");
  });

  it("refuses a receipt older than the window, and one from the future", () => {
    expect(codeOf(verify(SUPERMARKET, settings(), BIZ.name, new Date("2026-11-20T12:00:00Z")))).toBe("receipts/out-of-date");
    expect(codeOf(verify(SUPERMARKET, settings(), BIZ.name, new Date("2026-10-20T12:00:00Z")))).toBe("receipts/out-of-date");
  });

  it("accepts a date a day ahead, because the slip carries local time and the server UTC", () => {
    expect(codeOf(verify(SUPERMARKET, settings(), BIZ.name, new Date("2026-10-31T23:00:00Z")))).toBe("ok");
  });

  it("settles day-first versus month-first by the window", () => {
    const result = verify(RESTAURANT, settings(), CAFE.name, new Date("2026-11-06T12:00:00Z"));
    expect(result.ok && result.value.date).toBe("2026-11-05");
  });

  it("says what could not be read", () => {
    const result = verify("Bravo Supermarket\nThanks");
    expect(!result.ok && result.error).toMatchObject({ code: "receipts/unreadable", missing: ["total", "date", "id"] });
  });

  it("refuses a total above the limit", () => {
    expect(codeOf(verify("Bravo Supermarket\nTOTAL 311.00\nTRX# 12345 11/01/26", settings({ maxAmountDollars: 100 })))).toBe("receipts/amount-too-high");
  });

  it("produces the same keys for two reads of one slip", () => {
    const first = verify(SUPERMARKET);
    const second = verify(SUPERMARKET_POOR_READ);
    expect(first.ok && second.ok && first.value.keys).toEqual(second.ok && second.value.keys);
  });

  it("keeps a key when a second photo misreads the other identifier", () => {
    const first = verify(SUPERMARKET);
    const misread = verify(SUPERMARKET.replace("015987", "015937"));
    const [a, b] = [first.ok ? first.value.keys : [], misread.ok ? misread.value.keys : []];
    expect(a.some((key) => b.includes(key))).toBe(true);
  });

  it("normalizes letters OCR confuses with digits", () => {
    const first = verify(SUPERMARKET);
    const misread = verify(SUPERMARKET.replace("04266Q", "O4266Q").replace("015987", "O15987"));
    expect(first.ok && misread.ok && first.value.keys).toEqual(misread.ok && misread.value.keys);
  });

  it("uses the time as an identifier only when there is no number", () => {
    const result = verify("Bravo Supermarket\nTOTAL 5.00\n11/01/26 14:41");
    expect(result.ok && result.value.keys).toEqual(["time|14:41|2026-11-01|500"]);
  });
});

describe("the owner's settings", () => {
  it("start off, with the rate the client asked for", () => {
    const rules = ReceiptSettings.defaults();
    expect(rules.enabled).toBe(false);
    expect(rules.pointsPerDollar).toBe(2);
  });

  it("round part of a point down", () => {
    expect(settings().pointsFor(311)).toBe(6);
    expect(settings({ pointsPerDollar: 1 }).pointsFor(99)).toBe(0);
  });

  it.each([
    { maxAgeDays: 0 },
    { maxAgeDays: 31 },
    { maxAmountDollars: 0 },
    { pointsPerDollar: 0 },
    { pointsPerDollar: 1.5 },
    { dailyLimit: 21 },
    { storeNames: ["ab"] },
    { storeNames: ["one1", "two2", "three", "four", "five", "six6"] },
    { merchantIds: ["123"] },
  ])("refuse %j", (overrides) => {
    const result = ReceiptSettings.create({ enabled: true, storeNames: [], merchantIds: [], maxAgeDays: 2, maxAmountDollars: 500, pointsPerDollar: 2, dailyLimit: 3, ...overrides });
    expect(result.ok).toBe(false);
  });

  it("clean up what the owner types", () => {
    const rules = settings({ storeNames: ["  Bravo   Market ", "Bravo   Market", ""], merchantIds: ["54-29 30", "542930"] });
    expect(rules.storeNames).toEqual(["Bravo Market"]);
    expect(rules.merchantIds).toEqual(["542930"]);
  });
});

describe("a points account", () => {
  it("earns and counts the day's receipts", () => {
    const first = PointsAccount.empty(BIZ.id, "ana", NOW).earn(6, "r1", 2, NOW);
    expect(first.ok && first.value.account.balance).toBe(6);
    expect(first.ok && first.value.entry).toMatchObject({ delta: 6, balance: 6, receiptId: "r1" });
  });

  it("stops at the daily limit, and starts over the next day", () => {
    const one = PointsAccount.empty(BIZ.id, "ana", NOW).earn(1, "r1", 1, NOW);
    if (!one.ok) throw new Error("first earn failed");
    const again = one.value.account.earn(1, "r2", 1, NOW);
    expect(!again.ok && again.error).toBeInstanceOf(ReceiptDailyLimitError);
    expect(one.value.account.canEarn(1, new Date(NOW.getTime() + 86_400_000))).toBe(true);
  });

  it("refuses impossible stored numbers", () => {
    const snapshot = PointsAccount.empty(BIZ.id, "ana", NOW).toSnapshot();
    expect(PointsAccount.restore({ ...snapshot, balance: 5, totalEarned: 1 }).ok).toBe(false);
    expect(PointsAccount.restore({ ...snapshot, balance: -1 }).ok).toBe(false);
  });
});

describe("scanning a receipt", () => {
  let rules: InMemoryReceiptSettingsRepository;
  let ledger: InMemoryReceiptLedger;
  let points: InMemoryPointsRepository;
  let cards: InMemoryStampCardRepository;
  let programs: InMemoryStampProgramRepository;
  let timeline: { type: string; data: Record<string, unknown> }[];
  let customers: Set<string>;
  let read: ReceiptReader["read"];
  let reads: number;
  let now: Date;

  const stampRewards = (): StampRewards => {
    const grant = new GrantReceiptStamp(
      cards,
      programs,
      { record: async (entry) => void timeline.push(entry) },
      () => now
    );
    return {
      check: (businessId, userId) => grant.check({ businessId, userId }),
      grant: (businessId, userId) => grant.execute({ businessId, userId }),
    };
  };

  const scanner = (stamps = stampRewards()) =>
    new ScanReceipt(
      rules,
      { exists: async (_business, userId) => customers.has(userId) },
      { read: (image) => { reads += 1; return read(image); } },
      ledger,
      points,
      stamps,
      { pointsEarned: async (entry) => void timeline.push({ type: "points_earned", data: entry }) },
      () => now
    );

  const scan = (userId = "ana", business = BIZ) => scanner().execute({ business, userId, image: new Uint8Array([1]) });
  const codeOf = (result: Awaited<ReturnType<typeof scan>>) => (result.ok ? "ok" : result.error.code);

  beforeEach(async () => {
    rules = new InMemoryReceiptSettingsRepository();
    ledger = new InMemoryReceiptLedger();
    points = new InMemoryPointsRepository();
    cards = new InMemoryStampCardRepository();
    programs = new InMemoryStampProgramRepository();
    timeline = [];
    customers = new Set(["ana", "luis"]);
    read = async () => SUPERMARKET;
    reads = 0;
    now = NOW;
    await rules.save(BIZ.id, settings());
    await rules.save(CAFE.id, settings());
  });

  it("gives a supermarket customer points for the total", async () => {
    const result = await scan();
    expect(result.ok && result.value).toEqual({ totalCents: 311, date: "2026-11-01", reward: { kind: "points", earned: 6, balance: 6 } });
    expect((await points.find(BIZ.id, "ana"))?.balance).toBe(6);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe("points_earned");
  });

  it("gives a restaurant customer one stamp, marked as coming from a receipt", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    const result = await scan("ana", CAFE);
    expect(result.ok && result.value.reward).toEqual({ kind: "stamp", stamps: 1, required: 10, rewardUnlocked: false });
    expect(cards.stamps[0]).toMatchObject({ source: "receipt", staffUserId: null, userId: "ana" });
    expect(timeline[0].data).toMatchObject({ source: "receipt" });
    expect(ledger.records[0]).toMatchObject({ reward: "stamp", points: null, totalCents: 2000 });
  });

  it("counts receipt stamps apart in the owner's report", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    await scan("ana", CAFE);
    const report = await new GetStampActivity(cards.activity, () => now).execute({ businessId: CAFE.id, days: 7 });
    expect(report.ok && report.value).toMatchObject({ totalStamps: 1, receiptStamps: 1, tableStamps: 0, staffStamps: 0 });
    expect(report.ok && report.value.topTableCustomers).toEqual([]);
  });

  it("does nothing until the owner turns it on", async () => {
    await rules.save(BIZ.id, ReceiptSettings.defaults());
    expect(codeOf(await scan())).toBe("receipts/disabled");
    expect(reads).toBe(0);
  });

  it("refuses someone who never joined", async () => {
    expect(codeOf(await scan("stranger"))).toBe("receipts/not-a-customer");
    expect(reads).toBe(0);
  });

  it("accepts a receipt once, even from a different customer", async () => {
    expect(codeOf(await scan("ana"))).toBe("ok");
    expect(codeOf(await scan("ana"))).toBe("receipts/already-used");
    expect(codeOf(await scan("luis"))).toBe("receipts/already-used");
    expect((await points.find(BIZ.id, "ana"))?.balance).toBe(6);
    expect(await points.find(BIZ.id, "luis")).toBeNull();
  });

  it("lets only one of two simultaneous scans of a receipt win", async () => {
    const results = await Promise.all([scan("ana"), scan("luis")]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(ledger.records).toHaveLength(1);
  });

  it("treats a receipt used in one business as free in another", async () => {
    const other = { ...BIZ, id: "biz-3" };
    await rules.save(other.id, settings());
    expect(codeOf(await scan("ana", BIZ))).toBe("ok");
    expect(codeOf(await scan("ana", other))).toBe("ok");
  });

  it("applies the daily limit before reading a photo", async () => {
    await rules.save(BIZ.id, settings({ dailyLimit: 1 }));
    expect(codeOf(await scan())).toBe("ok");
    read = async () => SUPERMARKET.replace("015987", "777777").replace("04266Q", "88888Q");
    reads = 0;
    expect(codeOf(await scan())).toBe("receipts/daily-limit");
    expect(reads).toBe(0);
  });

  it("applies the card's wait before reading a photo, and gives the time left", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    expect(codeOf(await scan("ana", CAFE))).toBe("ok");
    reads = 0;
    const second = await scan("ana", CAFE);
    expect(codeOf(second)).toBe("stamps/too-soon");
    expect(reads).toBe(0);
  });

  it("does not stamp a card whose reward is waiting", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    const program = StampProgram.create({ requiredStamps: 3, rewardName: "Coffee", cooldownMinutes: 5 });
    if (!program.ok) throw new Error("bad program");
    await programs.save(CAFE.id, program.value);
    for (let index = 0; index < 3; index += 1) {
      const at = new Date(now.getTime() - (3 - index) * 3_600_000);
      await cards.transact(CAFE.id, "ana", (card) => (card ?? StampCard.empty(CAFE.id, "ana", at)).stamp(program.value, "staff", at));
    }
    expect(codeOf(await scan("ana", CAFE))).toBe("stamps/reward-pending");
  });

  it("frees the receipt when the reward cannot be given, so it is not lost", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    const refusing: StampRewards = { check: async () => ok(undefined), grant: async () => err(new ReceiptDailyLimitError()) };
    const refused = await scanner(refusing).execute({ business: CAFE, userId: "ana", image: new Uint8Array([1]) });
    expect(codeOf(refused)).toBe("receipts/daily-limit");
    expect(ledger.records).toHaveLength(0);
    expect(codeOf(await scan("ana", CAFE))).toBe("ok");
  });

  it("frees the receipt when the reward crashes, and lets the failure surface", async () => {
    read = async () => RESTAURANT;
    now = new Date("2026-11-06T12:00:00Z");
    const crashing: StampRewards = { check: async () => ok(undefined), grant: async () => { throw new Error("database down"); } };
    await expect(scanner(crashing).execute({ business: CAFE, userId: "ana", image: new Uint8Array([1]) })).rejects.toThrow("database down");
    expect(ledger.keys.size).toBe(0);
  });

  it("keeps the points when the timeline fails", async () => {
    const failing = new ScanReceipt(rules, { exists: async () => true }, { read }, ledger, points, stampRewards(), { pointsEarned: async () => { throw new Error("crm down"); } }, () => now);
    const result = await failing.execute({ business: BIZ, userId: "ana", image: new Uint8Array([1]) });
    expect(result.ok).toBe(true);
    expect((await points.find(BIZ.id, "ana"))?.balance).toBe(6);
  });

  it("reports a file that is not an image", async () => {
    read = async () => null;
    expect(codeOf(await scan())).toBe("receipts/invalid-image");
  });

  it("caps reading attempts per person and day, failed ones included", async () => {
    read = async () => "nothing useful";
    for (let index = 0; index < MAX_ATTEMPTS_PER_DAY; index += 1) expect(codeOf(await scan())).toBe("receipts/wrong-store");
    reads = 0;
    expect(codeOf(await scan())).toBe("receipts/too-many-attempts");
    expect(reads).toBe(0);
    expect(codeOf(await scan("luis"))).toBe("receipts/wrong-store");
    now = new Date(NOW.getTime() + 86_400_000);
    expect(codeOf(await scan())).toBe("receipts/wrong-store");
  });

  it("stores no card data and no OCR text", async () => {
    read = async () => `${SUPERMARKET}\nCard # : ********1750`;
    await scan();
    expect(JSON.stringify(ledger.records)).not.toContain("1750");
    expect(JSON.stringify(ledger.records)).not.toContain("NESTLE");
  });

  it("feeds what the customer and the owner read", async () => {
    await scan();
    const summary = await new GetPointsSummary(points).execute({ businessId: BIZ.id, userId: "ana" });
    expect(summary.ok && summary.value).toMatchObject({ balance: 6, totalEarned: 6, entries: [{ delta: 6, balance: 6 }] });
    const balances = await new ListPointsBalances(points).execute({ businessId: BIZ.id, userIds: ["ana", "luis"] });
    expect(balances.ok && Object.keys(balances.value)).toEqual(["ana"]);
    const recent = await new ListRecentReceipts(ledger).execute({ businessId: BIZ.id, limit: 10 });
    expect(recent.ok && recent.value[0]).toMatchObject({ userId: "ana", totalCents: 311, points: 6, transactionId: "015987" });
  });
});

describe("the receipts API and pages", () => {
  it.each([
    ["receipts/not-a-customer", 404],
    ["receipts/too-many-attempts", 429],
    ["receipts/invalid-image", 400],
    ["receipts/already-used", 409],
    ["receipts/wrong-store", 409],
    ["stamps/too-soon", 409],
    ["receipts/corrupt-points", 500],
    ["anything/else", 400],
  ])("%s answers %i", (code, status) => {
    expect(statusForReceiptError(code)).toBe(status);
  });

  it("open the points page to customers, not only to administrators", () => {
    expect(isMemberPage("/me/points/bravo")).toBe(true);
    expect(isMemberPage("/me/other/bravo")).toBe(false);
  });
});

describe("the OCR engine", () => {
  /** A receipt drawn from text, so nothing real is checked in. */
  const drawReceipt = (lines: string[]) => {
    const body = lines.map((line, index) => `<text x="30" y="${50 + index * 34}" font-family="monospace" font-size="24">${line}</text>`).join("");
    return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${80 + lines.length * 34}"><rect width="100%" height="100%" fill="#f4f1ea"/>${body}</svg>`));
  };
  const lines = ["Bravo Supermarket", "3853 Cleveland Ave", "SUBTOTAL 2.98", "TAX 0.13", "TOTAL: $3.11", "TRX# 015987 2:41PM 11/01/26", "AMOUNT $3.11", "Authorization : 04266Q"];

  it("reads a drawn receipt, end to end through the parser", async () => {
    const reader = new TesseractReceiptReader();
    const text = await reader.read(await drawReceipt(lines).png().toBuffer());
    const result = verifyReceipt(parseReceipt(text ?? ""), settings(), BIZ.name, NOW);
    expect(result.ok && result.value).toMatchObject({ totalCents: 311, date: "2026-11-01", transactionId: "015987" });
  }, 60_000);

  it("reads a dim, slightly rotated photo of it", async () => {
    const reader = new TesseractReceiptReader();
    const photo = await drawReceipt(lines).rotate(2, { background: "#555" }).linear(0.6, 30).blur(0.6).jpeg({ quality: 70 }).toBuffer();
    const result = verifyReceipt(parseReceipt((await reader.read(photo)) ?? ""), settings(), BIZ.name, NOW);
    expect(result.ok && result.value.totalCents).toBe(311);
  }, 60_000);

  it("answers null for something that is not an image, without loading the engine", async () => {
    expect(await new TesseractReceiptReader().read(new TextEncoder().encode("not an image"))).toBeNull();
  });
});
