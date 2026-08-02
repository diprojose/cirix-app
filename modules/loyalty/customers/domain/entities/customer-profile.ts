import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CustomerProfileId } from "../value-objects/customer-profile-id";
import {
  classifySegment,
  isRfmSegment,
  type RfmSegment,
  type RfmThresholds,
} from "../value-objects/rfm-segment";
import { CorruptCustomerProfileSnapshotError } from "../errors/customers-errors";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Absolute week index (weeks since the epoch) — consecutive weeks differ by 1. */
const weekIndex = (iso: string): number => Math.floor(Date.parse(iso) / MS_PER_WEEK);

/** Whole days between two ISO instants. */
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);

/** Props backing a {@link CustomerProfile} aggregate (the id is the customer uid). */
type CustomerProfileProps = {
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
  segment: RfmSegment;
  streakWeeks: number;
  streakLastWeek: number | null;
  winBackSentAt: string | null;
  createdAt: string;
};

/** Input accepted by {@link CustomerProfile.restore} when rehydrating persistence. */
export type RestoreCustomerProfileInput = {
  uid: string;
  orderCount: number;
  totalSpentCents: number;
  lastOrderAt: string | null;
  segment: string;
  streakWeeks: number;
  streakLastWeek: number | null;
  winBackSentAt: string | null;
  createdAt: string;
};

/**
 * CustomerProfile is the aggregate root of the retention context: a signed-in
 * customer's loyalty standing derived from their purchase history — RFM segment
 * (BR-21), weekly streak (BR-25) and win-back tracking (BR-17). It is kept up to
 * date incrementally on each confirmed order rather than by scanning the order
 * store, so segmentation stays cheap; a periodic recalculation then demotes
 * customers whose recency has drifted even without new orders.
 */
export class CustomerProfile extends AggregateRoot<CustomerProfileProps, CustomerProfileId> {
  private constructor(id: CustomerProfileId, props: CustomerProfileProps) {
    super(id, props);
  }

  /** Creates a fresh profile for a customer with no recorded orders yet. */
  static createNew(uid: string): CustomerProfile {
    return new CustomerProfile(CustomerProfileId.from(uid), {
      orderCount: 0,
      totalSpentCents: 0,
      lastOrderAt: null,
      segment: "nuevo",
      streakWeeks: 0,
      streakLastWeek: null,
      winBackSentAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  /** Rebuilds a profile from a persisted snapshot, revalidating its segment. */
  static restore(input: RestoreCustomerProfileInput): Result<CustomerProfile, DomainError> {
    if (!isRfmSegment(input.segment)) {
      return err(new CorruptCustomerProfileSnapshotError(`Unknown RFM segment "${input.segment}".`));
    }
    return ok(
      new CustomerProfile(CustomerProfileId.from(input.uid), {
        orderCount: input.orderCount,
        totalSpentCents: input.totalSpentCents,
        lastOrderAt: input.lastOrderAt,
        segment: input.segment,
        streakWeeks: input.streakWeeks,
        streakLastWeek: input.streakLastWeek,
        winBackSentAt: input.winBackSentAt,
        createdAt: input.createdAt,
      })
    );
  }

  /**
   * Folds a confirmed order into the profile: bumps frequency and monetary,
   * refreshes recency, advances the weekly streak (resetting it if a week was
   * skipped, BR-25) and recomputes the segment. Returns a new profile.
   */
  recordOrder(input: {
    orderTotalCents: number;
    nowIso: string;
    thresholds: RfmThresholds;
  }): CustomerProfile {
    const orderCount = this.props.orderCount + 1;
    const totalSpentCents = this.props.totalSpentCents + Math.max(0, input.orderTotalCents);
    const week = weekIndex(input.nowIso);
    const streakWeeks = this.nextStreak(week);

    return new CustomerProfile(this._id, {
      ...this.props,
      orderCount,
      totalSpentCents,
      lastOrderAt: input.nowIso,
      streakWeeks,
      streakLastWeek: week,
      segment: classifySegment({ orderCount, totalSpentCents, recencyDays: 0 }, input.thresholds),
    });
  }

  /** Recomputes the segment from current recency (the periodic demotion job). */
  withRecalculatedSegment(nowIso: string, thresholds: RfmThresholds): CustomerProfile {
    return new CustomerProfile(this._id, {
      ...this.props,
      segment: classifySegment(
        {
          orderCount: this.props.orderCount,
          totalSpentCents: this.props.totalSpentCents,
          recencyDays: this.recencyDays(nowIso),
        },
        thresholds
      ),
    });
  }

  /** Resets the streak counter after its bonus has been paid. */
  resetStreak(): CustomerProfile {
    return new CustomerProfile(this._id, { ...this.props, streakWeeks: 0 });
  }

  /** Records that a win-back incentive was sent, opening a new inactivity window. */
  markWinBackSent(nowIso: string): CustomerProfile {
    return new CustomerProfile(this._id, { ...this.props, winBackSentAt: nowIso });
  }

  /** Days since the last order, or a large number when there is none. */
  recencyDays(nowIso: string): number {
    return this.props.lastOrderAt === null
      ? Number.MAX_SAFE_INTEGER
      : daysBetween(this.props.lastOrderAt, nowIso);
  }

  /** The streak count after an order in the given week index. */
  private nextStreak(week: number): number {
    if (this.props.streakLastWeek === null) {
      return 1;
    }
    if (week === this.props.streakLastWeek) {
      return this.props.streakWeeks;
    }
    if (week === this.props.streakLastWeek + 1) {
      return this.props.streakWeeks + 1;
    }
    return 1;
  }

  get uid(): string {
    return this._id.value;
  }

  get orderCount(): number {
    return this.props.orderCount;
  }

  get totalSpentCents(): number {
    return this.props.totalSpentCents;
  }

  get lastOrderAt(): string | null {
    return this.props.lastOrderAt;
  }

  get segment(): RfmSegment {
    return this.props.segment;
  }

  get streakWeeks(): number {
    return this.props.streakWeeks;
  }

  get streakLastWeek(): number | null {
    return this.props.streakLastWeek;
  }

  get winBackSentAt(): string | null {
    return this.props.winBackSentAt;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }
}
