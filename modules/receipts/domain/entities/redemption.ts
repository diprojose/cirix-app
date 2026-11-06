import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { RedemptionCancelledError, RedemptionDeliveredError, RedemptionExpiredError } from "../errors/receipt-errors";
import type { Reward } from "./reward";

export type RedemptionStatus = "pending" | "delivered" | "cancelled" | "expired";

export type RedemptionSnapshot = {
  code: string;
  businessId: string;
  userId: string;
  rewardId: string;
  /** Name and price as they were when redeemed: the catalog may change afterwards. */
  rewardName: string;
  points: number;
  status: RedemptionStatus;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  /** Who handed the prize over. */
  staffUserId: string | null;
};

/** Long enough to come back on a later shopping trip. */
export const REDEMPTION_DAYS = 30;

/** No 0/O or 1/I: people read this code out loud and type it. 32 symbols, so a random byte maps evenly. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export function generateRedemptionCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Reads a scanned or typed code. Anything else is null, so it never reaches a storage path. */
export function normalizeRedemptionCode(text: string): string | null {
  const code = text.toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

/** ABCD-EFGH, easier to read out at the counter. */
export const formatRedemptionCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * A prize a customer chose and has not picked up yet. The points leave their
 * balance when it opens and return if it is cancelled or expires. Only staff at
 * the counter can mark it delivered, which is what keeps a customer from claiming
 * a prize from home. Pure: the repository applies it inside a transaction.
 */
export class Redemption {
  private constructor(private readonly props: RedemptionSnapshot) {}

  static open(reward: Reward, userId: string, now: Date, code: string = generateRedemptionCode()): Redemption {
    return new Redemption({
      code,
      businessId: reward.businessId,
      userId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + REDEMPTION_DAYS * 86_400_000).toISOString(),
      resolvedAt: null,
      staffUserId: null,
    });
  }

  static restore(snapshot: RedemptionSnapshot): Redemption {
    return new Redemption({ ...snapshot });
  }

  /** Past its date but not yet closed: the points are still waiting to go back. */
  isOverdue(now: Date): boolean {
    return this.props.status === "pending" && now.getTime() >= Date.parse(this.props.expiresAt);
  }

  /** The status to show, which counts an overdue code as expired before anyone has closed it. */
  statusAt(now: Date): RedemptionStatus {
    return this.isOverdue(now) ? "expired" : this.props.status;
  }

  /** Why this code cannot be used right now, if so. */
  unusableReason(now: Date): DomainError | null {
    switch (this.statusAt(now)) {
      case "delivered":
        return new RedemptionDeliveredError();
      case "cancelled":
        return new RedemptionCancelledError();
      case "expired":
        return new RedemptionExpiredError();
      default:
        return null;
    }
  }

  deliver(staffUserId: string, now: Date): Result<Redemption, DomainError> {
    const reason = this.unusableReason(now);
    if (reason) return err(reason);
    return ok(new Redemption({ ...this.props, status: "delivered", resolvedAt: now.toISOString(), staffUserId }));
  }

  /** The customer changed their mind, while the code is still open. */
  cancel(now: Date): Result<Redemption, DomainError> {
    const reason = this.unusableReason(now);
    if (reason) return err(reason);
    return ok(new Redemption({ ...this.props, status: "cancelled", resolvedAt: now.toISOString() }));
  }

  expire(now: Date): Redemption {
    return new Redemption({ ...this.props, status: "expired", resolvedAt: now.toISOString() });
  }

  toSnapshot(): RedemptionSnapshot {
    return { ...this.props };
  }

  get code(): string {
    return this.props.code;
  }

  get userId(): string {
    return this.props.userId;
  }

  get rewardName(): string {
    return this.props.rewardName;
  }

  get points(): number {
    return this.props.points;
  }

  get status(): RedemptionStatus {
    return this.props.status;
  }

  get expiresAt(): string {
    return this.props.expiresAt;
  }
}
