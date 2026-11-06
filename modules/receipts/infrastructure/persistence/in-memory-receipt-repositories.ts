import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PointsAccount, PointsChange, PointsEntry } from "../../domain/entities/points-account";
import { ok } from "@/shared/domain/result";
import type { Redemption } from "../../domain/entities/redemption";
import type { Reward } from "../../domain/entities/reward";
import type {
  PointsRepository,
  ReceiptLedger,
  ReceiptRecord,
  ReceiptSettingsRepository,
  RedemptionChange,
  RedemptionRepository,
  RewardCatalog,
} from "../../domain/ports/receipt-ports";
import { ReceiptSettings } from "../../domain/value-objects/receipt-settings";

/** Process-local adapter for tests. */
export class InMemoryReceiptSettingsRepository implements ReceiptSettingsRepository {
  private readonly settings = new Map<string, ReceiptSettings>();

  async get(businessId: string): Promise<ReceiptSettings> {
    return this.settings.get(businessId) ?? ReceiptSettings.defaults();
  }

  async save(businessId: string, settings: ReceiptSettings): Promise<void> {
    this.settings.set(businessId, settings);
  }
}

/** Process-local adapter for tests. `claim` has no await between check and write, so it is atomic. */
export class InMemoryReceiptLedger implements ReceiptLedger {
  readonly records: ReceiptRecord[] = [];
  readonly keys = new Set<string>();
  private readonly attempts = new Map<string, number>();

  async claim(record: ReceiptRecord, keys: readonly string[]): Promise<boolean> {
    const scoped = keys.map((key) => `${record.businessId}_${key}`);
    if (scoped.some((key) => this.keys.has(key))) return false;
    scoped.forEach((key) => this.keys.add(key));
    this.records.push(record);
    return true;
  }

  async release(record: ReceiptRecord, keys: readonly string[]): Promise<void> {
    keys.forEach((key) => this.keys.delete(`${record.businessId}_${key}`));
    this.records.splice(this.records.findIndex((entry) => entry.id === record.id), 1);
  }

  async countAttempt(businessId: string, userId: string, day: string): Promise<number> {
    const key = `${businessId}_${userId}_${day}`;
    const count = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, count);
    return count;
  }

  async recent(businessId: string, limit: number): Promise<ReceiptRecord[]> {
    return this.records
      .filter((record) => record.businessId === businessId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  }
}

/** Process-local adapter for tests. */
export class InMemoryRewardCatalog implements RewardCatalog {
  private readonly rewards = new Map<string, Reward>();

  async list(businessId: string): Promise<Reward[]> {
    return [...this.rewards.values()].filter((reward) => reward.businessId === businessId).sort((a, b) => a.points - b.points);
  }

  async find(businessId: string, rewardId: string): Promise<Reward | null> {
    return this.rewards.get(`${businessId}_${rewardId}`) ?? null;
  }

  async save(reward: Reward): Promise<void> {
    this.rewards.set(`${reward.businessId}_${reward.id}`, reward);
  }

  async delete(businessId: string, rewardId: string): Promise<void> {
    this.rewards.delete(`${businessId}_${rewardId}`);
  }
}

/** Process-local adapter for tests, sharing its balances with an in-memory points repository. */
export class InMemoryRedemptionRepository implements RedemptionRepository {
  readonly items = new Map<string, Redemption>();

  constructor(private readonly points: InMemoryPointsRepository) {}

  private key = (businessId: string, code: string) => `${businessId}_${code}`;

  private applyPoints(businessId: string, userId: string, change: PointsChange | null): Promise<unknown> {
    return change ? this.points.transact(businessId, userId, () => ok(change)) : Promise.resolve();
  }

  async find(businessId: string, code: string): Promise<Redemption | null> {
    return this.items.get(this.key(businessId, code)) ?? null;
  }

  private ofBusiness(businessId: string): Redemption[] {
    return [...this.items.entries()]
      .filter(([key]) => key.startsWith(`${businessId}_`))
      .map(([, redemption]) => redemption)
      .sort((a, b) => b.toSnapshot().createdAt.localeCompare(a.toSnapshot().createdAt));
  }

  async listForCustomer(businessId: string, userId: string): Promise<Redemption[]> {
    return this.ofBusiness(businessId).filter((redemption) => redemption.userId === userId);
  }

  async recent(businessId: string, limit: number): Promise<Redemption[]> {
    return this.ofBusiness(businessId).slice(0, limit);
  }

  async open(
    businessId: string,
    userId: string,
    decide: (account: PointsAccount | null) => Result<{ redemption: Redemption; points: PointsChange }, DomainError>
  ): Promise<Result<Redemption, DomainError>> {
    const result = decide(await this.points.find(businessId, userId));
    if (!result.ok) return result;
    await this.applyPoints(businessId, userId, result.value.points);
    this.items.set(this.key(businessId, result.value.redemption.code), result.value.redemption);
    return ok(result.value.redemption);
  }

  async settle(
    businessId: string,
    code: string,
    decide: (redemption: Redemption | null, account: PointsAccount | null) => Result<RedemptionChange, DomainError>
  ): Promise<Result<Redemption, DomainError>> {
    const current = await this.find(businessId, code);
    const result = decide(current, current ? await this.points.find(businessId, current.userId) : null);
    if (!result.ok) return result;
    const { redemption, points } = result.value;
    await this.applyPoints(businessId, redemption.userId, points);
    this.items.set(this.key(businessId, code), redemption);
    return ok(redemption);
  }
}

/** Process-local adapter for tests. */
export class InMemoryPointsRepository implements PointsRepository {
  private readonly accounts = new Map<string, PointsAccount>();
  readonly ledger: PointsEntry[] = [];

  private key = (businessId: string, userId: string) => `${businessId}_${userId}`;

  async find(businessId: string, userId: string): Promise<PointsAccount | null> {
    return this.accounts.get(this.key(businessId, userId)) ?? null;
  }

  async findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, PointsAccount>> {
    const found = new Map<string, PointsAccount>();
    for (const userId of userIds) {
      const account = this.accounts.get(this.key(businessId, userId));
      if (account) found.set(userId, account);
    }
    return found;
  }

  async entries(businessId: string, userId: string, limit: number): Promise<PointsEntry[]> {
    return this.ledger.filter((entry) => entry.businessId === businessId && entry.userId === userId).reverse().slice(0, limit);
  }

  async transact(
    businessId: string,
    userId: string,
    decide: (current: PointsAccount | null) => Result<PointsChange, DomainError>
  ): Promise<Result<PointsChange, DomainError>> {
    const key = this.key(businessId, userId);
    const result = decide(this.accounts.get(key) ?? null);
    if (result.ok) {
      this.accounts.set(key, result.value.account);
      this.ledger.push(result.value.entry);
    }
    return result;
  }
}
