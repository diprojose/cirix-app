import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { Identifier } from "@/shared/domain/identifier";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampProgram } from "../value-objects/stamp-program";
import {
  CorruptStampCardError,
  NoRewardToRedeemError,
  ProgramInactiveError,
  RewardPendingError,
  StampTooSoonError,
} from "../errors/stamp-card-errors";

/** Identity of one person's card in one business. */
export class StampCardId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static of(businessId: string, userId: string): StampCardId {
    return new StampCardId(`${businessId}_${userId}`);
  }
}

/** How a stamp was given: an employee scanned the customer, the customer scanned the table QR, or sent a receipt. */
export type StampSource = "staff" | "table_qr" | "receipt";

/** The immutable record of one stamp: who earned it and how it was given. */
export type StampRecord = {
  id: string;
  businessId: string;
  userId: string;
  source: StampSource;
  /** The employee who gave it; null when the customer stamped their own card. */
  staffUserId: string | null;
  at: string;
  /** Position of this stamp in the customer's whole history, starting at 1. */
  sequence: number;
};

/** The immutable record of one reward being handed over. */
export type RedemptionRecord = {
  id: string;
  businessId: string;
  userId: string;
  staffUserId: string;
  at: string;
};

type StampCardProps = {
  businessId: string;
  userId: string;
  /** Stamps collected in the current cycle. */
  stamps: number;
  /** True once the cycle is complete and until the reward is redeemed. */
  rewardReady: boolean;
  /** Every stamp ever given, across all cycles. */
  totalStamps: number;
  redeemedCount: number;
  lastStampAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StampCardSnapshot = StampCardProps;

/** What a card change produced; the repository persists all of it atomically. */
export type StampChange = { card: StampCard; stamp: StampRecord; rewardUnlocked: boolean };
export type RedeemChange = { card: StampCard; redemption: RedemptionRecord };

/** What staff may do with the card right now. */
export type CardStatus = {
  canStamp: boolean;
  canRedeem: boolean;
  /** Seconds until the next stamp is allowed, or 0. */
  retryAfterSeconds: number;
};

/**
 * StampCard is the state of one customer's loyalty card, with every rule that
 * protects it. It is pure: it takes the program and the time as inputs, so the
 * antifraud behavior can be tested without a database.
 *
 * The cycle is: collect stamps until the program's target, the reward becomes
 * ready, staff redeem it, and the card restarts at zero. While a reward waits,
 * no more stamps are added, and a stamp is refused if the customer was stamped
 * less than the cooldown ago (which also defeats replayed or doubled scans).
 */
export class StampCard extends AggregateRoot<StampCardProps, StampCardId> {
  private constructor(id: StampCardId, props: StampCardProps) {
    super(id, props);
  }

  /** A customer's first, empty card. */
  static empty(businessId: string, userId: string, now: Date = new Date()): StampCard {
    const stamp = now.toISOString();
    return new StampCard(StampCardId.of(businessId, userId), {
      businessId,
      userId,
      stamps: 0,
      rewardReady: false,
      totalStamps: 0,
      redeemedCount: 0,
      lastStampAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  /** Rebuilds a stored card, refusing impossible numbers. */
  static restore(snapshot: StampCardSnapshot): Result<StampCard, DomainError> {
    const counters = [snapshot.stamps, snapshot.totalStamps, snapshot.redeemedCount];
    if (!counters.every((value) => Number.isInteger(value) && value >= 0) || snapshot.stamps > snapshot.totalStamps) {
      return err(new CorruptStampCardError("Stored stamp card holds impossible counters."));
    }
    return ok(new StampCard(StampCardId.of(snapshot.businessId, snapshot.userId), { ...snapshot }));
  }

  /**
   * A card also counts as complete when the owner lowered the target below the
   * stamps already collected, so nobody is left waiting for a stamp they earned.
   */
  isRewardReady(program: StampProgram): boolean {
    return this.props.rewardReady || this.props.stamps >= program.requiredStamps;
  }

  /** Stamps to show: never more than the target, even after the target was lowered. */
  displayStamps(program: StampProgram): number {
    return Math.min(this.props.stamps, program.requiredStamps);
  }

  status(program: StampProgram, now: Date): CardStatus {
    const retryAfterSeconds = this.secondsUntilNextStamp(program, now);
    const ready = this.isRewardReady(program);
    return {
      canStamp: program.active && !ready && retryAfterSeconds === 0,
      canRedeem: ready,
      retryAfterSeconds,
    };
  }

  /**
   * Adds one stamp, or explains why not. Never mutates this card. `staffUserId`
   * is null when the customer stamped their own card, and `selfSource` says how;
   * the same cooldown and pending-reward rules apply either way.
   */
  stamp(
    program: StampProgram,
    staffUserId: string | null,
    now: Date,
    selfSource: Exclude<StampSource, "staff"> = "table_qr"
  ): Result<StampChange, DomainError> {
    if (!program.active) return err(new ProgramInactiveError());
    if (this.isRewardReady(program)) return err(new RewardPendingError());
    const wait = this.secondsUntilNextStamp(program, now);
    if (wait > 0) return err(new StampTooSoonError(wait));

    const stamps = this.props.stamps + 1;
    const rewardUnlocked = stamps >= program.requiredStamps;
    const at = now.toISOString();
    const card = new StampCard(this.id, {
      ...this.props,
      stamps: rewardUnlocked ? program.requiredStamps : stamps,
      rewardReady: rewardUnlocked,
      totalStamps: this.props.totalStamps + 1,
      lastStampAt: at,
      updatedAt: at,
    });
    return ok({
      card,
      rewardUnlocked,
      stamp: {
        id: crypto.randomUUID(),
        businessId: this.props.businessId,
        userId: this.props.userId,
        source: staffUserId === null ? selfSource : "staff",
        staffUserId,
        at,
        sequence: card.props.totalStamps,
      },
    });
  }

  /** Hands over the reward and restarts the cycle at zero. */
  redeem(program: StampProgram, staffUserId: string, now: Date): Result<RedeemChange, DomainError> {
    if (!this.isRewardReady(program)) return err(new NoRewardToRedeemError());
    const at = now.toISOString();
    const card = new StampCard(this.id, {
      ...this.props,
      stamps: 0,
      rewardReady: false,
      redeemedCount: this.props.redeemedCount + 1,
      // lastStampAt is kept: the cooldown still protects the next visit's stamp.
      updatedAt: at,
    });
    return ok({
      card,
      redemption: { id: crypto.randomUUID(), businessId: this.props.businessId, userId: this.props.userId, staffUserId, at },
    });
  }

  private secondsUntilNextStamp(program: StampProgram, now: Date): number {
    if (this.props.lastStampAt === null) return 0;
    const readyAt = Date.parse(this.props.lastStampAt) + program.cooldownMinutes * 60_000;
    return Math.max(0, Math.ceil((readyAt - now.getTime()) / 1000));
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get stamps(): number {
    return this.props.stamps;
  }

  get rewardReady(): boolean {
    return this.props.rewardReady;
  }

  get totalStamps(): number {
    return this.props.totalStamps;
  }

  get redeemedCount(): number {
    return this.props.redeemedCount;
  }

  get lastStampAt(): string | null {
    return this.props.lastStampAt;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this.props.updatedAt;
  }
}
