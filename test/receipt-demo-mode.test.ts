import { beforeEach, describe, expect, it } from "vitest";
import { err, ok } from "@/shared/domain/result";
import { ConfirmReceipt, ScanReceipt } from "@/modules/receipts/application/use-cases/scan-receipt";
import { HmacPendingReceiptSigner } from "@/modules/receipts/infrastructure/crypto/hmac-pending-receipt-signer";
import { SaveReceiptSettings } from "@/modules/receipts/application/use-cases/receipt-queries";
import { toReceiptSettingsDto } from "@/modules/receipts/application/dtos/receipt-dtos";
import { ReceiptSettings } from "@/modules/receipts/domain/value-objects/receipt-settings";
import { parseReceipt } from "@/modules/receipts/domain/services/parse-receipt";
import { describeReading } from "@/modules/receipts/domain/services/verify-receipt";
import { StampTooSoonError } from "@/modules/stamp-card/domain/errors/stamp-card-errors";
import {
  InMemoryPointsRepository,
  InMemoryReceiptDemoLog,
  InMemoryReceiptLedger,
  InMemoryReceiptSettingsRepository,
} from "@/modules/receipts/infrastructure/persistence/in-memory-receipt-repositories";

const NOW = new Date("2026-11-06T12:00:00.000Z");
const IMAGE = new Uint8Array([1]);
const SUPER = { id: "super", name: "Super Demo", kind: "supermarket" };
const CAFE = { id: "cafe", name: "Cafe Demo", kind: "restaurant" };
const OTHER_STORE_OLD = "PUBLIX MARKET\n123 MAIN ST\n03/15/24 14:30\nTRX# 777\nTOTAL $20.50\nAUTH 1234";
const RULES = { enabled: true, storeNames: [], merchantIds: [], maxAgeDays: 2, maxAmountDollars: 500, pointsPerDollar: 2, dailyLimit: 1 };

let settings: InMemoryReceiptSettingsRepository;
let ledger: InMemoryReceiptLedger;
let points: InMemoryPointsRepository;
let text: string | null;
let stampResult: () => ReturnType<typeof ok> | ReturnType<typeof err>;

let demoLog: InMemoryReceiptDemoLog;
const SIGNER = new HmacPendingReceiptSigner("a-test-secret-of-at-least-32-characters");

/** Scans and confirms, as a customer who agrees with the total; `read` is what the preview showed. */
const scan = async (business = SUPER) => {
  const customers = { exists: async (_business: string, userId: string) => userId !== "stranger" };
  const stamps = { check: async () => err(new StampTooSoonError(600)), grant: async () => stampResult() as never };
  const preview = await new ScanReceipt(settings, customers, { read: async () => text }, ledger, points, stamps, SIGNER, demoLog, () => NOW).execute({
    business,
    userId: "ana",
    image: IMAGE,
  });
  if (!preview.ok) return preview;
  const confirmed = await new ConfirmReceipt(settings, customers, ledger, points, stamps, { pointsEarned: async () => undefined }, SIGNER, () => NOW).execute({
    business,
    userId: "ana",
    token: preview.value.token,
  });
  return confirmed.ok ? ok({ ...confirmed.value, read: preview.value.read }) : confirmed;
};

async function configure(businessId: string, demoMode: boolean) {
  const created = ReceiptSettings.create({ ...RULES, demoMode });
  if (!created.ok) throw created.error;
  await settings.save(businessId, created.value);
}

beforeEach(() => {
  settings = new InMemoryReceiptSettingsRepository();
  ledger = new InMemoryReceiptLedger();
  points = new InMemoryPointsRepository();
  demoLog = new InMemoryReceiptDemoLog();
  text = OTHER_STORE_OLD;
  stampResult = () => ok({ stamps: 1, required: 10, rewardUnlocked: false });
});

describe("receipts with demo mode on", () => {
  beforeEach(() => configure(SUPER.id, true));

  it("accepts another store's old receipt, and shows what was read", async () => {
    const result = await scan();
    expect(result.ok && result.value.reward).toEqual({ kind: "points", earned: 41, balance: 41 });
    expect(result.ok && result.value.read).toMatchObject({
      store: "PUBLIX MARKET",
      totalCents: 2050,
      time: "14:30",
      transactionId: "777",
      authCode: "1234",
    });
  });

  it("lets the same receipt be shown again and again, past the daily limit", async () => {
    for (let round = 1; round <= 3; round += 1) {
      const result = await scan();
      expect(result.ok && result.value.reward).toMatchObject({ balance: 41 * round });
    }
    // One key per reading: each confirmation counts once, never the receipt itself.
    expect(ledger.keys.size).toBe(3);
  });

  it("uses the largest amount when no line was read as the total", async () => {
    text = "TIENDA\nCAFE 3.50\nPAN 12.25\nTOTOL 15.75";
    const result = await scan();
    expect(result.ok && result.value.totalCents).toBe(1575);
  });

  it("does not take the cash handed over for the total", async () => {
    text = "TIENDA\nTOTOL 7.99\nEFECTIVO 10.00\nCAMBIO 2.01";
    const result = await scan();
    expect(result.ok && result.value.totalCents).toBe(799);
  });

  it("keeps every reading, also the failed ones, to look into them later", async () => {
    await scan();
    text = "UN GATO\nSIN NUMEROS";
    await scan();
    expect(demoLog.entries.map((entry) => entry.totalCents)).toEqual([2050, null]);
    expect(demoLog.entries[1].lines).toEqual(["UN GATO", "SIN NUMEROS"]);
  });

  it("falls back to today when no date was read, and says it was not read", async () => {
    text = "TIENDA\nTOTAL 5.00";
    const result = await scan();
    expect(result.ok && result.value.date).toBe("2026-11-06");
    expect(result.ok && result.value.read?.date).toBeNull();
  });

  it("still needs an amount, and returns what it could read", async () => {
    text = "UN GATO\nSIN NUMEROS";
    const result = await scan();
    expect(!result.ok && result.error.code).toBe("receipts/unreadable");
    expect(!result.ok && (result.error as unknown as { read: { store: string } }).read.store).toBe("UN GATO");
    expect(ledger.records).toHaveLength(0);
  });

  it("still refuses a file that is not an image", async () => {
    text = null;
    const result = await scan();
    expect(!result.ok && result.error.code).toBe("receipts/invalid-image");
  });
});

describe("demo mode at a restaurant", () => {
  beforeEach(() => configure(CAFE.id, true));

  it("gives the stamp and shows the reading", async () => {
    const result = await scan(CAFE);
    expect(result.ok && result.value.reward).toMatchObject({ kind: "stamp", stamps: 1 });
    expect(result.ok && result.value.read?.totalCents).toBe(2050);
  });

  it("shows the reading even when the card is waiting between stamps", async () => {
    stampResult = () => err(new StampTooSoonError(600));
    const result = await scan(CAFE);
    expect(result.ok && result.value.reward).toEqual({ kind: "none", code: "stamps/too-soon", retryAfterSeconds: 600 });
    expect(result.ok && result.value.read?.store).toBe("PUBLIX MARKET");
    expect(ledger.records).toHaveLength(0);
  });
});

describe("demo mode never leaks into a real business", () => {
  it("is off by default", () => {
    expect(ReceiptSettings.defaults().demoMode).toBe(false);
    const created = ReceiptSettings.create(RULES);
    expect(created.ok && created.value.demoMode).toBe(false);
  });

  it("only turns on for an exact true", () => {
    const created = ReceiptSettings.create({ ...RULES, demoMode: "true" as unknown as boolean });
    expect(created.ok && created.value.demoMode).toBe(false);
  });

  it("keeps every check, and reveals nothing, without it", async () => {
    await configure(SUPER.id, false);
    const wrong = await scan();
    expect(!wrong.ok && wrong.error.code).toBe("receipts/wrong-store");
    expect(JSON.stringify(wrong)).not.toContain("PUBLIX");

    text = "SUPER DEMO\n11/06/26 10:00\nTRX# 1\nTOTAL 5.00";
    const first = await scan();
    expect(first.ok && first.value.read).toBeUndefined();
    expect(demoLog.entries).toHaveLength(0);
    const repeated = await scan();
    expect(!repeated.ok).toBe(true);
  });

  it("does not let the owner's form turn it on", async () => {
    await configure(SUPER.id, false);
    const saved = await new SaveReceiptSettings(settings).execute({ businessId: SUPER.id, ...RULES, demoMode: true });
    expect(saved.ok && saved.value.demoMode).toBe(false);
    expect((await settings.get(SUPER.id)).demoMode).toBe(false);
  });

  it("does not let the owner's form turn it off", async () => {
    await configure(SUPER.id, true);
    await new SaveReceiptSettings(settings).execute({ businessId: SUPER.id, ...RULES, maxAgeDays: 5 });
    const stored = await settings.get(SUPER.id);
    expect(stored.demoMode).toBe(true);
    expect(toReceiptSettingsDto(stored).maxAgeDays).toBe(5);
  });
});

describe("the reading", () => {
  it("picks the newest date that is not in the future", () => {
    const read = describeReading(parseReceipt("TIENDA\n11/01/26\nTOTAL 1.00"), NOW);
    expect(read.date).toBe("2026-11-01");
  });

  it("keeps a date in the future rather than hide what the receipt says", () => {
    const read = describeReading(parseReceipt("TIENDA\n12/31/30\nTOTAL 1.00"), NOW);
    expect(read.date).toBe("2030-12-31");
  });
});
