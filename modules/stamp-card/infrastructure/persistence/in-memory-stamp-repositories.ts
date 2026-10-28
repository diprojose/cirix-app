import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampCard, StampRecord, RedemptionRecord } from "../../domain/entities/stamp-card";
import type { CardWrite, StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import type { CustomerActivityLog } from "../../domain/ports/customer-activity-log";
import type { CustomerDirectory, CustomerSummary } from "../../domain/ports/customer-directory";
import type { TableCode, TableCodeRepository } from "../../domain/ports/table-code-repository";
import { activityDay, type DailyStampActivity, type StampActivityReader } from "../../domain/ports/stamp-activity";
import { StampProgram } from "../../domain/value-objects/stamp-program";
import { newTableCode } from "../crypto/table-code";

/** Process-local daily totals, fed by {@link InMemoryStampCardRepository} like the Firestore adapter. */
export class InMemoryStampActivity implements StampActivityReader {
  private readonly totals = new Map<string, DailyStampActivity>();

  private day(businessId: string, at: string): DailyStampActivity {
    const key = `${businessId}_${activityDay(at)}`;
    let day = this.totals.get(key);
    if (!day) {
      day = { day: activityDay(at), staffStamps: {}, tableStamps: 0, redemptions: {}, tableStampsByCustomer: {} };
      this.totals.set(key, day);
    }
    return day;
  }

  countStamp(stamp: StampRecord): void {
    const day = this.day(stamp.businessId, stamp.at);
    if (stamp.staffUserId === null) {
      day.tableStamps += 1;
      day.tableStampsByCustomer[stamp.userId] = (day.tableStampsByCustomer[stamp.userId] ?? 0) + 1;
    } else {
      day.staffStamps[stamp.staffUserId] = (day.staffStamps[stamp.staffUserId] ?? 0) + 1;
    }
  }

  countRedemption(redemption: RedemptionRecord): void {
    const day = this.day(redemption.businessId, redemption.at);
    day.redemptions[redemption.staffUserId] = (day.redemptions[redemption.staffUserId] ?? 0) + 1;
  }

  async days(businessId: string, fromDay: string, toDay: string): Promise<DailyStampActivity[]> {
    return [...this.totals]
      .filter(([key, day]) => key.startsWith(`${businessId}_`) && day.day >= fromDay && day.day <= toDay)
      .map(([, day]) => structuredClone(day))
      .sort((a, b) => a.day.localeCompare(b.day));
  }
}

/** Process-local adapter for tests. `transact` has no await between read and write, so it is atomic. */
export class InMemoryStampCardRepository implements StampCardRepository {
  private readonly cards = new Map<string, StampCard>();
  readonly stamps: StampRecord[] = [];
  readonly redemptions: RedemptionRecord[] = [];

  constructor(readonly activity: InMemoryStampActivity = new InMemoryStampActivity()) {}

  private key = (businessId: string, userId: string) => `${businessId}_${userId}`;

  async find(businessId: string, userId: string): Promise<StampCard | null> {
    return this.cards.get(this.key(businessId, userId)) ?? null;
  }

  async findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, StampCard>> {
    const found = new Map<string, StampCard>();
    for (const userId of userIds) {
      const card = this.cards.get(this.key(businessId, userId));
      if (card) found.set(userId, card);
    }
    return found;
  }

  async transact<T extends CardWrite>(
    businessId: string,
    userId: string,
    decide: (current: StampCard | null) => Result<T, DomainError>
  ): Promise<Result<T, DomainError>> {
    const key = this.key(businessId, userId);
    const result = decide(this.cards.get(key) ?? null);
    if (result.ok) {
      this.cards.set(key, result.value.card);
      if (result.value.stamp) {
        this.stamps.push(result.value.stamp);
        this.activity.countStamp(result.value.stamp);
      }
      if (result.value.redemption) {
        this.redemptions.push(result.value.redemption);
        this.activity.countRedemption(result.value.redemption);
      }
    }
    return result;
  }
}

/** Process-local adapter for tests. */
export class InMemoryStampProgramRepository implements StampProgramRepository {
  private readonly programs = new Map<string, StampProgram>();

  async get(businessId: string): Promise<StampProgram> {
    return this.programs.get(businessId) ?? StampProgram.defaults();
  }

  async save(businessId: string, program: StampProgram): Promise<void> {
    this.programs.set(businessId, program);
  }
}

/** Process-local adapter for tests. */
export class InMemoryTableCodeRepository implements TableCodeRepository {
  private readonly codes = new Map<string, TableCode>();

  async current(businessId: string): Promise<TableCode> {
    let code = this.codes.get(businessId);
    if (!code) {
      code = { code: newTableCode(), createdAt: new Date().toISOString() };
      this.codes.set(businessId, code);
    }
    return code;
  }

  async rotate(businessId: string): Promise<TableCode> {
    const code = { code: newTableCode(), createdAt: new Date().toISOString() };
    this.codes.set(businessId, code);
    return code;
  }
}

/** Test double for the CRM: people are added explicitly. */
export class InMemoryCustomerDirectory implements CustomerDirectory {
  private readonly people = new Map<string, CustomerSummary>();

  add(businessId: string, userId: string, firstName: string): void {
    this.people.set(`${businessId}_${userId}`, { firstName });
  }

  async find(businessId: string, userId: string): Promise<CustomerSummary | null> {
    return this.people.get(`${businessId}_${userId}`) ?? null;
  }
}

/** Test double for the timeline: keeps what was reported, and can be made to fail. */
export class InMemoryActivityLog implements CustomerActivityLog {
  readonly entries: Parameters<CustomerActivityLog["record"]>[0][] = [];
  failing = false;

  async record(input: Parameters<CustomerActivityLog["record"]>[0]): Promise<void> {
    if (this.failing) throw new Error("timeline unavailable");
    if (!this.entries.some((entry) => entry.eventId === input.eventId)) this.entries.push(input);
  }
}
