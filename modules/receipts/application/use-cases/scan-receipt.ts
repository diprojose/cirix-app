import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PointsAccount } from "../../domain/entities/points-account";
import {
  InvalidReceiptConfirmationError,
  InvalidReceiptImageError,
  ReceiptAlreadyUsedError,
  ReceiptConfirmationExpiredError,
  ReceiptDailyLimitError,
  ReceiptNotACustomerError,
  ReceiptsDisabledError,
  ReceiptTooManyAttemptsError,
  ReceiptUnreadableError,
} from "../../domain/errors/receipt-errors";
import { StampTooSoonError } from "@/modules/stamp-card/domain/errors/stamp-card-errors";
import type { ReceiptSettings } from "../../domain/value-objects/receipt-settings";
import type {
  PendingReceipt,
  PendingReceiptSigner,
  PointsRepository,
  ReceiptActivityLog,
  ReceiptCustomers,
  ReceiptDemoLog,
  ReceiptLedger,
  ReceiptReader,
  ReceiptRecord,
  ReceiptSettingsRepository,
  StampRewards,
} from "../../domain/ports/receipt-ports";
import { parseReceipt, type ParsedReceipt } from "../../domain/services/parse-receipt";
import { describeReading, verifyReceipt, type VerifiedReceipt } from "../../domain/services/verify-receipt";
import type { ReceiptPreviewDto, ScanReceiptDto, ScanRewardDto } from "../dtos/receipt-dtos";

/** Reading a photo costs real CPU: this caps what one person can make the server do per day. */
export const MAX_ATTEMPTS_PER_DAY = 15;

/** Failures a better-prepared photo can turn around. A wrong date or a used receipt stays wrong. */
const WORTH_ANOTHER_PASS = new Set(["receipts/unreadable", "receipts/wrong-store", "receipts/amount-too-high"]);

type Business = { id: string; name: string; kind: string };

export type ScanReceiptInput = {
  business: Business;
  /** The customer, from the verified session. */
  userId: string;
  image: Uint8Array;
};

export type ConfirmReceiptInput = {
  business: Business;
  /** The customer, from the verified session. */
  userId: string;
  /** What the scan returned, sent back unchanged. */
  token: string;
};

/** The part both steps share: who may use receipts here at all. */
async function admit(
  settings: ReceiptSettingsRepository,
  customers: ReceiptCustomers,
  businessId: string,
  userId: string
): Promise<Result<ReceiptSettings, DomainError>> {
  const rules = await settings.get(businessId);
  if (!rules.enabled) return err(new ReceiptsDisabledError());
  if (!(await customers.exists(businessId, userId))) return err(new ReceiptNotACustomerError());
  return ok(rules);
}

/**
 * Step one: a customer sends a photo of their receipt and sees what was read.
 * The total and the identifiers are read here on the server from the photo,
 * never accepted from the browser, or anyone could simply type a receipt in.
 * Nothing is earned yet: the reading comes back signed, for the customer to
 * confirm (ConfirmReceipt) or to throw away and take another photo.
 */
export class ScanReceipt implements UseCase<ScanReceiptInput, ReceiptPreviewDto> {
  constructor(
    private readonly settings: ReceiptSettingsRepository,
    private readonly customers: ReceiptCustomers,
    private readonly reader: ReceiptReader,
    private readonly ledger: ReceiptLedger,
    private readonly points: PointsRepository,
    private readonly stamps: StampRewards,
    private readonly signer: PendingReceiptSigner,
    private readonly demoLog: ReceiptDemoLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute({ business, userId, image }: ScanReceiptInput): Promise<Result<ReceiptPreviewDto, DomainError>> {
    const now = this.now();
    const admitted = await admit(this.settings, this.customers, business.id, userId);
    if (!admitted.ok) return admitted;
    const settings = admitted.value;

    const earnsPoints = business.kind === "supermarket";
    if (settings.demoMode) return this.demo(business.id, userId, image, settings, earnsPoints, now);

    // Anything that would refuse the reward anyway is said before spending time on the photo.
    if (earnsPoints) {
      const account = await this.points.find(business.id, userId);
      if (account !== null && !account.canEarn(settings.dailyLimit, now)) return err(new ReceiptDailyLimitError());
    } else {
      const possible = await this.stamps.check(business.id, userId);
      if (!possible.ok) return possible;
    }

    const attempts = await this.ledger.countAttempt(business.id, userId, now.toISOString().slice(0, 10));
    if (attempts > MAX_ATTEMPTS_PER_DAY) return err(new ReceiptTooManyAttemptsError());

    let first: Result<VerifiedReceipt, DomainError> | null = null;
    for await (const parsed of this.readings(image)) {
      if (parsed === null) return err(new InvalidReceiptImageError());
      const verified = verifyReceipt(parsed, settings, business.name, now);
      if (verified.ok) {
        const { totalCents, date, transactionId, merchantId, keys } = verified.value;
        return ok(this.preview({ businessId: business.id, userId, totalCents, date, transactionId, merchantId, keys, demo: false }, settings, earnsPoints, now));
      }
      first ??= verified;
      if (!WORTH_ANOTHER_PASS.has(verified.error.code)) break;
    }
    return first ?? err(new InvalidReceiptImageError());
  }

  /**
   * Each way the reader can prepare the photo, in order; the caller stops as soon
   * as one is good enough. Yields null when the file is not an image at all.
   */
  private async *readings(image: Uint8Array): AsyncGenerator<ParsedReceipt | null> {
    const passes = Math.max(1, this.reader.passes ?? 1);
    for (let pass = 0; pass < passes; pass += 1) {
      const text = await this.reader.read(image, pass);
      if (text === null) {
        if (pass === 0) yield null;
        return;
      }
      yield parseReceipt(text);
    }
  }

  private preview(
    reading: Omit<PendingReceipt, "nonce">,
    settings: ReceiptSettings,
    earnsPoints: boolean,
    now: Date
  ): ReceiptPreviewDto {
    return {
      totalCents: reading.totalCents,
      date: reading.date,
      earns: earnsPoints ? { kind: "points", points: settings.pointsFor(reading.totalCents) } : { kind: "stamp" },
      token: this.signer.sign({ ...reading, nonce: crypto.randomUUID() }, now),
    };
  }

  /**
   * For sales demos: any store, any date, as many times as wanted, and the screen
   * shows what was read. Only a total is needed, because points are worked out from
   * it. Each reading is kept in the demo log, to look into the ones that went wrong.
   */
  private async demo(
    businessId: string,
    userId: string,
    image: Uint8Array,
    settings: ReceiptSettings,
    earnsPoints: boolean,
    now: Date
  ): Promise<Result<ReceiptPreviewDto, DomainError>> {
    let best: ParsedReceipt | null = null;
    for await (const parsed of this.readings(image)) {
      if (parsed === null) return err(new InvalidReceiptImageError());
      // A labelled total beats a guess; the first guess beats a later one.
      if (best === null || (best.totalCents === null && parsed.totalCents !== null) || (best.fallbackTotalCents === null && parsed.fallbackTotalCents !== null)) {
        best = parsed;
      }
      if (best.totalCents !== null) break;
    }
    if (best === null) return err(new InvalidReceiptImageError());

    const read = describeReading(best, now);
    await this.demoLog
      .save({ businessId, userId, at: now.toISOString(), totalCents: read.totalCents, lines: read.lines })
      .catch(() => undefined);
    if (read.totalCents === null || read.totalCents <= 0) return err(new ReceiptUnreadableError(["total"], read));

    const reading = {
      businessId,
      userId,
      totalCents: read.totalCents,
      date: read.date ?? now.toISOString().slice(0, 10),
      transactionId: read.transactionId,
      merchantId: read.merchantId,
      keys: [],
      demo: true,
    };
    return ok({ ...this.preview(reading, settings, earnsPoints, now), read });
  }
}

/**
 * Step two: the customer saw the total and says it is right. The receipt is
 * taken and the reward given, exactly as the signed reading says. The browser
 * cannot alter it, and each reading counts once.
 */
export class ConfirmReceipt implements UseCase<ConfirmReceiptInput, ScanReceiptDto> {
  constructor(
    private readonly settings: ReceiptSettingsRepository,
    private readonly customers: ReceiptCustomers,
    private readonly ledger: ReceiptLedger,
    private readonly points: PointsRepository,
    private readonly stamps: StampRewards,
    private readonly activity: ReceiptActivityLog,
    private readonly signer: PendingReceiptSigner,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute({ business, userId, token }: ConfirmReceiptInput): Promise<Result<ScanReceiptDto, DomainError>> {
    const now = this.now();
    const signed = this.signer.verify(token, now);
    if (!signed.ok) return signed;
    const pending = signed.value;
    if (pending.businessId !== business.id || pending.userId !== userId) return err(new InvalidReceiptConfirmationError());

    const admitted = await admit(this.settings, this.customers, business.id, userId);
    if (!admitted.ok) return admitted;
    const settings = admitted.value;
    // Read under one set of rules, confirmed under another: start over.
    if (pending.demo !== settings.demoMode) return err(new ReceiptConfirmationExpiredError());

    const earnsPoints = business.kind === "supermarket";
    const record: ReceiptRecord = {
      id: crypto.randomUUID(),
      businessId: business.id,
      userId,
      totalCents: pending.totalCents,
      date: pending.date,
      transactionId: pending.transactionId,
      merchantId: pending.merchantId,
      reward: earnsPoints ? "points" : "stamp",
      points: earnsPoints ? settings.pointsFor(pending.totalCents) : null,
      at: now.toISOString(),
    };
    // A demo receipt can be shown again and again, but each reading of it counts once.
    const keys = pending.demo ? [`reading|${pending.nonce}`] : pending.keys;
    if (!(await this.ledger.claim(record, keys))) return err(new ReceiptAlreadyUsedError());

    // The receipt is taken first: a crash right here can only cost the customer, never the business.
    let reward: Result<ScanRewardDto, DomainError>;
    try {
      reward = await this.reward(record, pending.demo ? Number.POSITIVE_INFINITY : settings.dailyLimit, now);
    } catch (error) {
      await this.ledger.release(record, keys).catch(() => undefined);
      throw error;
    }
    if (reward.ok) return ok({ totalCents: record.totalCents, date: record.date, reward: reward.value });

    await this.ledger.release(record, keys);
    if (!pending.demo) return reward;
    // In a demo, a card waiting between stamps should not look like a failed reading.
    const { error } = reward;
    return ok({
      totalCents: record.totalCents,
      date: record.date,
      reward: { kind: "none", code: error.code, retryAfterSeconds: error instanceof StampTooSoonError ? error.retryAfterSeconds : null },
    });
  }

  private async reward(record: ReceiptRecord, dailyLimit: number, now: Date): Promise<Result<ScanRewardDto, DomainError>> {
    const { businessId, userId } = record;
    if (record.points === null) {
      const stamp = await this.stamps.grant(businessId, userId);
      return stamp.ok ? ok({ kind: "stamp", ...stamp.value }) : stamp;
    }

    const earned = record.points;
    const change = await this.points.transact(businessId, userId, (current) =>
      (current ?? PointsAccount.empty(businessId, userId, now)).earn(earned, record.id, dailyLimit, now)
    );
    if (!change.ok) return change;
    const { account, entry } = change.value;
    // The timeline is a convenience copy: a failure here must never undo the points.
    await this.activity
      .pointsEarned({ businessId, userId, eventId: entry.id, points: earned, balance: account.balance, receiptId: record.id })
      .catch(() => undefined);
    return ok({ kind: "points", earned, balance: account.balance });
  }
}
