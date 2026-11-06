import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { PointsAccount } from "../../domain/entities/points-account";
import {
  InvalidReceiptImageError,
  ReceiptAlreadyUsedError,
  ReceiptDailyLimitError,
  ReceiptNotACustomerError,
  ReceiptsDisabledError,
  ReceiptTooManyAttemptsError,
} from "../../domain/errors/receipt-errors";
import type {
  PointsRepository,
  ReceiptActivityLog,
  ReceiptCustomers,
  ReceiptLedger,
  ReceiptReader,
  ReceiptRecord,
  ReceiptSettingsRepository,
  StampRewards,
} from "../../domain/ports/receipt-ports";
import { parseReceipt } from "../../domain/services/parse-receipt";
import { verifyReceipt } from "../../domain/services/verify-receipt";
import type { ScanReceiptDto, ScanRewardDto } from "../dtos/receipt-dtos";

/** Reading a photo costs real CPU: this caps what one person can make the server do per day. */
export const MAX_ATTEMPTS_PER_DAY = 15;

export type ScanReceiptInput = {
  business: { id: string; name: string; kind: string };
  /** The customer, from the verified session. */
  userId: string;
  image: Uint8Array;
};

/**
 * A customer sends a photo of their receipt and earns from it: a stamp at a
 * restaurant, points at a supermarket. The total and the identifiers are read
 * here on the server from the photo, never accepted from the browser, or anyone
 * could simply type a receipt in.
 */
export class ScanReceipt implements UseCase<ScanReceiptInput, ScanReceiptDto> {
  constructor(
    private readonly settings: ReceiptSettingsRepository,
    private readonly customers: ReceiptCustomers,
    private readonly reader: ReceiptReader,
    private readonly ledger: ReceiptLedger,
    private readonly points: PointsRepository,
    private readonly stamps: StampRewards,
    private readonly activity: ReceiptActivityLog,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute({ business, userId, image }: ScanReceiptInput): Promise<Result<ScanReceiptDto, DomainError>> {
    const now = this.now();
    const settings = await this.settings.get(business.id);
    if (!settings.enabled) return err(new ReceiptsDisabledError());
    if (!(await this.customers.exists(business.id, userId))) return err(new ReceiptNotACustomerError());

    // Anything that would refuse the reward anyway is said before spending time on the photo.
    const earnsPoints = business.kind === "supermarket";
    if (earnsPoints) {
      const account = await this.points.find(business.id, userId);
      if (account !== null && !account.canEarn(settings.dailyLimit, now)) return err(new ReceiptDailyLimitError());
    } else {
      const possible = await this.stamps.check(business.id, userId);
      if (!possible.ok) return possible;
    }

    const attempts = await this.ledger.countAttempt(business.id, userId, now.toISOString().slice(0, 10));
    if (attempts > MAX_ATTEMPTS_PER_DAY) return err(new ReceiptTooManyAttemptsError());

    const text = await this.reader.read(image);
    if (text === null) return err(new InvalidReceiptImageError());

    const verified = verifyReceipt(parseReceipt(text), settings, business.name, now);
    if (!verified.ok) return verified;
    const { totalCents, date, transactionId, merchantId, keys } = verified.value;

    const record: ReceiptRecord = {
      id: crypto.randomUUID(),
      businessId: business.id,
      userId,
      totalCents,
      date,
      transactionId,
      merchantId,
      reward: earnsPoints ? "points" : "stamp",
      points: earnsPoints ? settings.pointsFor(totalCents) : null,
      at: now.toISOString(),
    };
    if (!(await this.ledger.claim(record, keys))) return err(new ReceiptAlreadyUsedError());

    // The receipt is taken first: a crash right here can only cost the customer, never the business.
    let reward: Result<ScanRewardDto, DomainError>;
    try {
      reward = await this.reward(record, settings.dailyLimit, now);
    } catch (error) {
      await this.ledger.release(record, keys).catch(() => undefined);
      throw error;
    }
    if (!reward.ok) {
      await this.ledger.release(record, keys);
      return reward;
    }
    return ok({ totalCents, date, reward: reward.value });
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
