import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { activityDay, type StampActivityReader } from "../../domain/ports/stamp-activity";
import { InvalidReportRangeError } from "../../domain/errors/stamp-card-errors";

/*
 * Owner reports. They only read, and they receive the business id from a
 * caller that already checked the viewer may read customers.
 */

/** Where one customer stands, for the owner's customer list. */
export type CardProgressDto = {
  stamps: number;
  required: number;
  rewardReady: boolean;
  totalStamps: number;
  redeemedCount: number;
  lastStampAt: string | null;
};

export type ListCardProgressInput = { businessId: string; userIds: readonly string[] };

/** Most customers a single progress lookup reads, matching one page of the list. */
export const MAX_PROGRESS_LOOKUP = 100;

/** The card progress of a page of customers; people who never got a stamp are left out. */
export class ListCardProgress implements UseCase<ListCardProgressInput, Record<string, CardProgressDto>> {
  constructor(
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository
  ) {}

  async execute(input: ListCardProgressInput): Promise<Result<Record<string, CardProgressDto>, DomainError>> {
    const userIds = [...new Set(input.userIds)].slice(0, MAX_PROGRESS_LOOKUP);
    if (userIds.length === 0) return ok({});
    const [program, cards] = await Promise.all([
      this.programs.get(input.businessId),
      this.cards.findMany(input.businessId, userIds),
    ]);
    const progress: Record<string, CardProgressDto> = {};
    for (const [userId, card] of cards) {
      progress[userId] = {
        stamps: card.displayStamps(program),
        required: program.requiredStamps,
        rewardReady: card.isRewardReady(program),
        totalStamps: card.totalStamps,
        redeemedCount: card.redeemedCount,
        lastStampAt: card.lastStampAt,
      };
    }
    return ok(progress);
  }
}

/** Periods an owner can look back over, in days. */
export const ACTIVITY_PERIODS = [7, 30, 90] as const;
export type ActivityPeriod = (typeof ACTIVITY_PERIODS)[number];

export const isActivityPeriod = (value: number): value is ActivityPeriod =>
  (ACTIVITY_PERIODS as readonly number[]).includes(value);

/** How many customers the report lists as the heaviest table QR users. */
export const TOP_TABLE_CUSTOMERS = 10;

export type StampActivityDto = {
  /** First and last UTC day covered, inclusive. */
  fromDay: string;
  toDay: string;
  totalStamps: number;
  tableStamps: number;
  staffStamps: number;
  redemptions: number;
  /** One row per employee who stamped or redeemed, busiest first. */
  byStaff: { userId: string; stamps: number; redemptions: number }[];
  /** Customers with the most table QR stamps, most first. */
  topTableCustomers: { userId: string; stamps: number }[];
};

export type GetStampActivityInput = { businessId: string; days: number };

/** Totals for the last `days` days (today included): by employee, by source, and the heaviest table QR users. */
export class GetStampActivity implements UseCase<GetStampActivityInput, StampActivityDto> {
  constructor(
    private readonly activity: StampActivityReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: GetStampActivityInput): Promise<Result<StampActivityDto, DomainError>> {
    if (!isActivityPeriod(input.days)) return err(new InvalidReportRangeError(input.days));
    const today = this.now();
    const toDay = activityDay(today.toISOString());
    const fromDay = activityDay(new Date(today.getTime() - (input.days - 1) * 86_400_000).toISOString());
    const days = await this.activity.days(input.businessId, fromDay, toDay);

    const staff = new Map<string, { stamps: number; redemptions: number }>();
    const tableByCustomer = new Map<string, number>();
    const row = (userId: string) => {
      let entry = staff.get(userId);
      if (!entry) staff.set(userId, (entry = { stamps: 0, redemptions: 0 }));
      return entry;
    };
    let tableStamps = 0;
    for (const day of days) {
      tableStamps += day.tableStamps;
      for (const [userId, count] of Object.entries(day.staffStamps)) row(userId).stamps += count;
      for (const [userId, count] of Object.entries(day.redemptions)) row(userId).redemptions += count;
      for (const [userId, count] of Object.entries(day.tableStampsByCustomer)) {
        tableByCustomer.set(userId, (tableByCustomer.get(userId) ?? 0) + count);
      }
    }

    const byStaff = [...staff]
      .map(([userId, counts]) => ({ userId, ...counts }))
      .sort((a, b) => b.stamps - a.stamps || b.redemptions - a.redemptions || a.userId.localeCompare(b.userId));
    const staffStamps = byStaff.reduce((sum, entry) => sum + entry.stamps, 0);
    const topTableCustomers = [...tableByCustomer]
      .map(([userId, stamps]) => ({ userId, stamps }))
      .sort((a, b) => b.stamps - a.stamps || a.userId.localeCompare(b.userId))
      .slice(0, TOP_TABLE_CUSTOMERS);

    return ok({
      fromDay,
      toDay,
      totalStamps: staffStamps + tableStamps,
      tableStamps,
      staffStamps,
      redemptions: byStaff.reduce((sum, entry) => sum + entry.redemptions, 0),
      byStaff,
      topTableCustomers,
    });
  }
}
