import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PointsAccount, PointsChange, PointsEntry } from "../entities/points-account";
import type { Redemption } from "../entities/redemption";
import type { Reward } from "../entities/reward";
import type { ReceiptSettings } from "../value-objects/receipt-settings";

/**
 * ReceiptReader turns a photo into text. Today that is free OCR on our own
 * server; a paid vision service can replace it by implementing this alone.
 */
export interface ReceiptReader {
  /** The text on the image. Resolves to `null` when the file is not a readable image. */
  read(image: Uint8Array): Promise<string | null>;
}

export interface ReceiptSettingsRepository {
  get(businessId: string): Promise<ReceiptSettings>;
  save(businessId: string, settings: ReceiptSettings): Promise<void>;
}

export type ReceiptReward = "stamp" | "points";

/** What is kept of a used receipt. Never the photo, the OCR text or anything about the card. */
export type ReceiptRecord = {
  id: string;
  businessId: string;
  userId: string;
  totalCents: number;
  date: string;
  transactionId: string | null;
  merchantId: string | null;
  reward: ReceiptReward;
  /** Points it earned; null when it earned a stamp. */
  points: number | null;
  at: string;
};

export interface ReceiptLedger {
  /**
   * Stores the record and all its keys in one atomic step. Resolves to false,
   * writing nothing, when any key was already taken: two people sending the
   * same receipt at the same moment cannot both win.
   */
  claim(record: ReceiptRecord, keys: readonly string[]): Promise<boolean>;
  /** Undoes a claim whose reward could not be given. */
  release(record: ReceiptRecord, keys: readonly string[]): Promise<void>;
  /** Counts one reading attempt and returns how many this person made on that day. */
  countAttempt(businessId: string, userId: string, day: string): Promise<number>;
  /** The newest used receipts of a business. */
  recent(businessId: string, limit: number): Promise<ReceiptRecord[]>;
}

export interface PointsRepository {
  find(businessId: string, userId: string): Promise<PointsAccount | null>;
  findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, PointsAccount>>;
  entries(businessId: string, userId: string, limit: number): Promise<PointsEntry[]>;
  /** Atomically reads the account, applies `decide` and stores its outcome. */
  transact(
    businessId: string,
    userId: string,
    decide: (current: PointsAccount | null) => Result<PointsChange, DomainError>
  ): Promise<Result<PointsChange, DomainError>>;
}

export type StampOutcome = { stamps: number; required: number; rewardUnlocked: boolean };

/** How this module gives a restaurant's stamp, without knowing how cards work. */
export interface StampRewards {
  /** Fails when a stamp could not be given right now, to spare reading a photo for nothing. */
  check(businessId: string, userId: string): Promise<Result<void, DomainError>>;
  grant(businessId: string, userId: string): Promise<Result<StampOutcome, DomainError>>;
}

export interface ReceiptCustomers {
  exists(businessId: string, userId: string): Promise<boolean>;
}

/** Best-effort copy on the customer's timeline. */
export interface ReceiptActivityLog {
  pointsEarned(input: { businessId: string; userId: string; eventId: string; points: number; balance: number; receiptId: string }): Promise<void>;
}

export interface RewardCatalog {
  /** All the prizes of a business, cheapest first. */
  list(businessId: string): Promise<Reward[]>;
  find(businessId: string, rewardId: string): Promise<Reward | null>;
  save(reward: Reward): Promise<void>;
  delete(businessId: string, rewardId: string): Promise<void>;
}

/** A change to a redemption, and to the balance when points move with it. */
export type RedemptionChange = { redemption: Redemption; points: PointsChange | null };

/**
 * Prize codes. Both writes run in one transaction with the customer's balance:
 * points can neither leave without a code, nor return twice.
 */
export interface RedemptionRepository {
  find(businessId: string, code: string): Promise<Redemption | null>;
  /** One person's redemptions, newest first. */
  listForCustomer(businessId: string, userId: string): Promise<Redemption[]>;
  /** The newest redemptions of a business. */
  recent(businessId: string, limit: number): Promise<Redemption[]>;
  /** Atomically reads the balance and stores the new code `decide` produced. */
  open(
    businessId: string,
    userId: string,
    decide: (account: PointsAccount | null) => Result<{ redemption: Redemption; points: PointsChange }, DomainError>
  ): Promise<Result<Redemption, DomainError>>;
  /** Atomically reads a code and its owner's balance, and stores the outcome of `decide`. */
  settle(
    businessId: string,
    code: string,
    decide: (redemption: Redemption | null, account: PointsAccount | null) => Result<RedemptionChange, DomainError>
  ): Promise<Result<Redemption, DomainError>>;
}

/** How staff greet the person in front of them, without browsing customer data. */
export interface CustomerNames {
  firstName(businessId: string, userId: string): Promise<string | null>;
}

/** Best-effort copy on the customer's timeline. */
export interface RedemptionActivityLog {
  rewardRedeemed(input: { businessId: string; userId: string; eventId: string; rewardName: string; points: number }): Promise<void>;
}
