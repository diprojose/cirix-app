import type { UseCase } from "@/shared/application/use-case";
import type { AuditTrail } from "@/shared/application/audit-trail";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PointsRepository, ReceiptLedger, ReceiptRecord, ReceiptSettingsRepository } from "../../domain/ports/receipt-ports";
import { ReceiptSettings, type ReceiptSettingsInput } from "../../domain/value-objects/receipt-settings";
import { toReceiptSettingsDto, type PointsSummaryDto, type ReceiptSettingsDto } from "../dtos/receipt-dtos";

/** How a page or the API reads a business's receipt rules. */
export class GetReceiptSettings implements UseCase<string, ReceiptSettingsDto> {
  constructor(private readonly settings: ReceiptSettingsRepository) {}

  async execute(businessId: string): Promise<Result<ReceiptSettingsDto, DomainError>> {
    return ok(toReceiptSettingsDto(await this.settings.get(businessId)));
  }
}

/** The owner changes the rules; they apply to the next receipt. */
export class SaveReceiptSettings implements UseCase<ReceiptSettingsInput & { businessId: string }, ReceiptSettingsDto> {
  constructor(private readonly settings: ReceiptSettingsRepository) {}

  async execute({ businessId, ...input }: ReceiptSettingsInput & { businessId: string }): Promise<Result<ReceiptSettingsDto, DomainError>> {
    // Demo mode is not the owner's to change: whatever arrives here, the stored value stays.
    const { demoMode } = await this.settings.get(businessId);
    const settings = ReceiptSettings.create({ ...input, demoMode });
    if (!settings.ok) return settings;
    await this.settings.save(businessId, settings.value);
    return ok(toReceiptSettingsDto(settings.value));
  }
}

export type SetReceiptDemoModeInput = { businessId: string; on: boolean; actorUserId: string };

/**
 * A Cirix administrator turns demo mode on for a sales demo, or off before a
 * business uses receipts for real. Turning it on also turns receipts on, so the
 * demo works at once; turning it off leaves the owner's own on/off untouched.
 * Every other rule stays as the owner left it.
 */
export class SetReceiptDemoMode implements UseCase<SetReceiptDemoModeInput, ReceiptSettingsDto> {
  constructor(
    private readonly settings: ReceiptSettingsRepository,
    private readonly audit: AuditTrail
  ) {}

  async execute({ businessId, on, actorUserId }: SetReceiptDemoModeInput): Promise<Result<ReceiptSettingsDto, DomainError>> {
    const current = await this.settings.get(businessId);
    if (current.demoMode === on) return ok(toReceiptSettingsDto(current));
    const next = ReceiptSettings.create({
      ...toReceiptSettingsDto(current),
      enabled: on ? true : current.enabled,
      demoMode: on,
    });
    if (!next.ok) return next;
    await this.settings.save(businessId, next.value);
    await this.audit.record({
      actorId: actorUserId,
      action: "receipts.demo_mode_changed",
      before: { businessId, demoMode: current.demoMode, enabled: current.enabled },
      after: { businessId, demoMode: next.value.demoMode, enabled: next.value.enabled },
    });
    return ok(toReceiptSettingsDto(next.value));
  }
}

/** The receipts a business accepted, newest first, so an owner can review them. */
export class ListRecentReceipts implements UseCase<{ businessId: string; limit: number }, ReceiptRecord[]> {
  constructor(private readonly ledger: ReceiptLedger) {}

  async execute({ businessId, limit }: { businessId: string; limit: number }): Promise<Result<ReceiptRecord[], DomainError>> {
    return ok(await this.ledger.recent(businessId, limit));
  }
}

/** A customer's own balance and latest movements. */
export class GetPointsSummary implements UseCase<{ businessId: string; userId: string }, PointsSummaryDto> {
  constructor(private readonly points: PointsRepository) {}

  async execute({ businessId, userId }: { businessId: string; userId: string }): Promise<Result<PointsSummaryDto, DomainError>> {
    const [account, entries] = await Promise.all([this.points.find(businessId, userId), this.points.entries(businessId, userId, 10)]);
    return ok({
      balance: account?.balance ?? 0,
      totalEarned: account?.totalEarned ?? 0,
      entries: entries.map(({ id, delta, balance, reason, at }) => ({ id, delta, balance, reason, at })),
    });
  }
}

export type PointsBalances = Record<string, { balance: number; lastEarnedAt: string | null }>;

/** Balances for the owner's customer list, keyed by user id. People with no points are left out. */
export class ListPointsBalances implements UseCase<{ businessId: string; userIds: readonly string[] }, PointsBalances> {
  constructor(private readonly points: PointsRepository) {}

  async execute({ businessId, userIds }: { businessId: string; userIds: readonly string[] }): Promise<Result<PointsBalances, DomainError>> {
    const accounts = await this.points.findMany(businessId, userIds);
    const balances: PointsBalances = {};
    for (const [userId, account] of accounts) balances[userId] = { balance: account.balance, lastEarnedAt: account.lastEarnedAt };
    return ok(balances);
  }
}
