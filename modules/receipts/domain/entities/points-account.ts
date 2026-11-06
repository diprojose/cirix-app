import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CorruptPointsAccountError, ReceiptDailyLimitError } from "../errors/receipt-errors";

export type PointsAccountSnapshot = {
  businessId: string;
  userId: string;
  balance: number;
  totalEarned: number;
  /** UTC day of `receiptsToday`; another day means the count starts over. */
  receiptsDay: string | null;
  receiptsToday: number;
  lastEarnedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The immutable record of one change to a balance. */
export type PointsEntry = {
  id: string;
  businessId: string;
  userId: string;
  delta: number;
  balance: number;
  reason: "receipt";
  receiptId: string;
  at: string;
};

export type PointsChange = { account: PointsAccount; entry: PointsEntry };

/**
 * One customer's points in one supermarket. Pure, like the stamp card: the
 * repository runs `earn` inside a transaction, so the balance and the daily
 * limit hold under concurrency.
 */
export class PointsAccount {
  private constructor(private readonly props: PointsAccountSnapshot) {}

  static empty(businessId: string, userId: string, now: Date = new Date()): PointsAccount {
    const at = now.toISOString();
    return new PointsAccount({
      businessId,
      userId,
      balance: 0,
      totalEarned: 0,
      receiptsDay: null,
      receiptsToday: 0,
      lastEarnedAt: null,
      createdAt: at,
      updatedAt: at,
    });
  }

  static restore(snapshot: PointsAccountSnapshot): Result<PointsAccount, DomainError> {
    const counters = [snapshot.balance, snapshot.totalEarned, snapshot.receiptsToday];
    if (!counters.every((value) => Number.isInteger(value) && value >= 0) || snapshot.balance > snapshot.totalEarned) {
      return err(new CorruptPointsAccountError("Stored points account holds impossible counters."));
    }
    return ok(new PointsAccount({ ...snapshot }));
  }

  private usedToday(now: Date): number {
    return this.props.receiptsDay === now.toISOString().slice(0, 10) ? this.props.receiptsToday : 0;
  }

  canEarn(dailyLimit: number, now: Date): boolean {
    return this.usedToday(now) < dailyLimit;
  }

  earn(points: number, receiptId: string, dailyLimit: number, now: Date): Result<PointsChange, DomainError> {
    if (!this.canEarn(dailyLimit, now)) return err(new ReceiptDailyLimitError());
    const at = now.toISOString();
    const account = new PointsAccount({
      ...this.props,
      balance: this.props.balance + points,
      totalEarned: this.props.totalEarned + points,
      receiptsDay: at.slice(0, 10),
      receiptsToday: this.usedToday(now) + 1,
      lastEarnedAt: at,
      updatedAt: at,
    });
    return ok({
      account,
      entry: {
        id: crypto.randomUUID(),
        businessId: this.props.businessId,
        userId: this.props.userId,
        delta: points,
        balance: account.balance,
        reason: "receipt",
        receiptId,
        at,
      },
    });
  }

  toSnapshot(): PointsAccountSnapshot {
    return { ...this.props };
  }

  get userId(): string {
    return this.props.userId;
  }

  get balance(): number {
    return this.props.balance;
  }

  get totalEarned(): number {
    return this.props.totalEarned;
  }

  get lastEarnedAt(): string | null {
    return this.props.lastEarnedAt;
  }
}
