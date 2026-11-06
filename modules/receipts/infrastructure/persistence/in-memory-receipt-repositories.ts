import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PointsAccount, PointsChange, PointsEntry } from "../../domain/entities/points-account";
import type { PointsRepository, ReceiptLedger, ReceiptRecord, ReceiptSettingsRepository } from "../../domain/ports/receipt-ports";
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
