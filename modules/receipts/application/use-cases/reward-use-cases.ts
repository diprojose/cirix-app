import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PointsAccount } from "../../domain/entities/points-account";
import { normalizeRedemptionCode, Redemption } from "../../domain/entities/redemption";
import { buildReward, REWARD_LIMITS, type RewardInput } from "../../domain/entities/reward";
import {
  CorruptPointsAccountError,
  InvalidRedemptionCodeError,
  NotEnoughPointsError,
  ReceiptNotACustomerError,
  RedemptionExpiredError,
  RedemptionNotFoundError,
  RewardCatalogFullError,
  RewardNotFoundError,
} from "../../domain/errors/receipt-errors";
import type {
  CustomerNames,
  ReceiptCustomers,
  RedemptionActivityLog,
  RedemptionChange,
  RedemptionRepository,
  RewardCatalog,
} from "../../domain/ports/receipt-ports";
import { toRedemptionDto, toRewardDto, type RedemptionDto, type RedemptionPreviewDto, type RewardDto } from "../dtos/reward-dtos";

/** Ids come from the URL and end up in a storage path. */
const REWARD_ID = /^[A-Za-z0-9-]{1,64}$/;

type Clock = () => Date;
const systemClock: Clock = () => new Date();

/** Closes a code whose points must go back. A missing account here means stored data was damaged. */
function closeWithRefund(closed: Redemption, account: PointsAccount | null, now: Date): Result<RedemptionChange, DomainError> {
  if (!account) return err(new CorruptPointsAccountError("A redemption has no points account to return to."));
  return ok({ redemption: closed, points: account.refund(closed.points, closed.code, now) });
}

/** The catalog. Customers see `activeOnly`; the owner sees every prize. */
export class ListRewards implements UseCase<{ businessId: string; activeOnly: boolean }, RewardDto[]> {
  constructor(private readonly catalog: RewardCatalog) {}

  async execute({ businessId, activeOnly }: { businessId: string; activeOnly: boolean }): Promise<Result<RewardDto[], DomainError>> {
    const rewards = await this.catalog.list(businessId);
    return ok(rewards.filter((reward) => !activeOnly || reward.active).map(toRewardDto));
  }
}

/** The owner adds a prize, or changes one when `rewardId` is set. */
export class SaveReward implements UseCase<RewardInput & { businessId: string; rewardId: string | null }, RewardDto> {
  constructor(private readonly catalog: RewardCatalog, private readonly now: Clock = systemClock) {}

  async execute({ businessId, rewardId, ...input }: RewardInput & { businessId: string; rewardId: string | null }): Promise<Result<RewardDto, DomainError>> {
    let identity: { id: string; businessId: string; createdAt?: string };
    if (rewardId === null) {
      if ((await this.catalog.list(businessId)).length >= REWARD_LIMITS.maxRewards) return err(new RewardCatalogFullError(REWARD_LIMITS.maxRewards));
      identity = { id: crypto.randomUUID(), businessId };
    } else {
      const existing = REWARD_ID.test(rewardId) ? await this.catalog.find(businessId, rewardId) : null;
      if (!existing) return err(new RewardNotFoundError());
      identity = { id: existing.id, businessId, createdAt: existing.createdAt };
    }
    const reward = buildReward(input, identity, this.now());
    if (!reward.ok) return reward;
    await this.catalog.save(reward.value);
    return ok(toRewardDto(reward.value));
  }
}

/** Open codes keep working: each one carries the prize's name and price. */
export class DeleteReward implements UseCase<{ businessId: string; rewardId: string }, void> {
  constructor(private readonly catalog: RewardCatalog) {}

  async execute({ businessId, rewardId }: { businessId: string; rewardId: string }): Promise<Result<void, DomainError>> {
    if (!REWARD_ID.test(rewardId) || !(await this.catalog.find(businessId, rewardId))) return err(new RewardNotFoundError());
    await this.catalog.delete(businessId, rewardId);
    return ok(undefined);
  }
}

/** The customer chooses a prize: their points leave and they get a code to show at the counter. */
export class RedeemPoints implements UseCase<{ businessId: string; userId: string; rewardId: string }, RedemptionDto> {
  constructor(
    private readonly catalog: RewardCatalog,
    private readonly customers: ReceiptCustomers,
    private readonly redemptions: RedemptionRepository,
    private readonly now: Clock = systemClock
  ) {}

  async execute({ businessId, userId, rewardId }: { businessId: string; userId: string; rewardId: string }): Promise<Result<RedemptionDto, DomainError>> {
    if (!(await this.customers.exists(businessId, userId))) return err(new ReceiptNotACustomerError());
    const reward = REWARD_ID.test(rewardId) ? await this.catalog.find(businessId, rewardId) : null;
    if (!reward || !reward.active) return err(new RewardNotFoundError());

    const now = this.now();
    const opened = await this.redemptions.open(businessId, userId, (account) => {
      if (!account) return err(new NotEnoughPointsError());
      const redemption = Redemption.open(reward, userId, now);
      const points = account.spend(reward.points, redemption.code, now);
      return points.ok ? ok({ redemption, points: points.value }) : points;
    });
    return opened.ok ? ok(toRedemptionDto(opened.value, now)) : opened;
  }
}

/** The customer changes their mind while the prize is not handed over: the points return. */
export class CancelRedemption implements UseCase<{ businessId: string; userId: string; code: string }, RedemptionDto> {
  constructor(private readonly redemptions: RedemptionRepository, private readonly now: Clock = systemClock) {}

  async execute({ businessId, userId, code }: { businessId: string; userId: string; code: string }): Promise<Result<RedemptionDto, DomainError>> {
    const normalized = normalizeRedemptionCode(code);
    if (!normalized) return err(new InvalidRedemptionCodeError());
    const now = this.now();
    const settled = await this.redemptions.settle(businessId, normalized, (redemption, account) => {
      // Someone else's code looks the same as one that does not exist.
      if (!redemption || redemption.userId !== userId) return err(new RedemptionNotFoundError());
      if (redemption.isOverdue(now)) return closeWithRefund(redemption.expire(now), account, now);
      const cancelled = redemption.cancel(now);
      return cancelled.ok ? closeWithRefund(cancelled.value, account, now) : cancelled;
    });
    return settled.ok ? ok(toRedemptionDto(settled.value, now)) : settled;
  }
}

/**
 * A customer's codes, newest first. There is no background job on the free plan,
 * so opening this list is what returns the points of codes that expired.
 */
export class ListMyRedemptions implements UseCase<{ businessId: string; userId: string }, RedemptionDto[]> {
  constructor(private readonly redemptions: RedemptionRepository, private readonly now: Clock = systemClock) {}

  async execute({ businessId, userId }: { businessId: string; userId: string }): Promise<Result<RedemptionDto[], DomainError>> {
    const now = this.now();
    const list = await this.redemptions.listForCustomer(businessId, userId);
    const closed = await Promise.all(
      list.map(async (redemption) => {
        if (!redemption.isOverdue(now)) return redemption;
        const settled = await this.redemptions.settle(businessId, redemption.code, (current, account) => {
          // Staff or another tab may have closed it since the list was read.
          if (!current || !current.isOverdue(now)) return ok({ redemption: current ?? redemption, points: null });
          return closeWithRefund(current.expire(now), account, now);
        });
        return settled.ok ? settled.value : redemption;
      })
    );
    return ok(closed.map((redemption) => toRedemptionDto(redemption, now)));
  }
}

/** The newest codes of a business, for the owner to review. */
export class ListRecentRedemptions implements UseCase<{ businessId: string; limit: number }, RedemptionDto[]> {
  constructor(private readonly redemptions: RedemptionRepository, private readonly now: Clock = systemClock) {}

  async execute({ businessId, limit }: { businessId: string; limit: number }): Promise<Result<RedemptionDto[], DomainError>> {
    const now = this.now();
    return ok((await this.redemptions.recent(businessId, limit)).map((redemption) => toRedemptionDto(redemption, now)));
  }
}

/** Staff scan a code and see the person and the prize. Nothing changes until they confirm. */
export class PreviewRedemption implements UseCase<{ businessId: string; code: string }, RedemptionPreviewDto> {
  constructor(
    private readonly redemptions: RedemptionRepository,
    private readonly names: CustomerNames,
    private readonly now: Clock = systemClock
  ) {}

  async execute({ businessId, code }: { businessId: string; code: string }): Promise<Result<RedemptionPreviewDto, DomainError>> {
    const normalized = normalizeRedemptionCode(code);
    if (!normalized) return err(new InvalidRedemptionCodeError());
    const redemption = await this.redemptions.find(businessId, normalized);
    if (!redemption) return err(new RedemptionNotFoundError());
    const reason = redemption.unusableReason(this.now());
    if (reason) return err(reason);
    return ok({
      code: redemption.code,
      firstName: (await this.names.firstName(businessId, redemption.userId)) ?? "",
      rewardName: redemption.rewardName,
      points: redemption.points,
    });
  }
}

/** Staff hand the prize over. A second scan of the same code is refused. */
export class DeliverRedemption implements UseCase<{ businessId: string; code: string; staffUserId: string }, RedemptionPreviewDto> {
  constructor(
    private readonly redemptions: RedemptionRepository,
    private readonly names: CustomerNames,
    private readonly activity: RedemptionActivityLog,
    private readonly now: Clock = systemClock
  ) {}

  async execute({ businessId, code, staffUserId }: { businessId: string; code: string; staffUserId: string }): Promise<Result<RedemptionPreviewDto, DomainError>> {
    const normalized = normalizeRedemptionCode(code);
    if (!normalized) return err(new InvalidRedemptionCodeError());
    const now = this.now();
    const settled = await this.redemptions.settle(businessId, normalized, (redemption, account) => {
      if (!redemption) return err(new RedemptionNotFoundError());
      // Overdue: close it now so the points go back, and tell staff below.
      if (redemption.isOverdue(now)) return closeWithRefund(redemption.expire(now), account, now);
      const delivered = redemption.deliver(staffUserId, now);
      return delivered.ok ? ok({ redemption: delivered.value, points: null }) : delivered;
    });
    if (!settled.ok) return settled;
    const redemption = settled.value;
    if (redemption.status === "expired") return err(new RedemptionExpiredError());

    // The timeline is a copy: failing to write it must not undo a prize already handed over.
    await this.activity
      .rewardRedeemed({ businessId, userId: redemption.userId, eventId: `redemption-${redemption.code}`, rewardName: redemption.rewardName, points: redemption.points })
      .catch((error: unknown) => console.error("Could not log the redemption", error));

    return ok({
      code: redemption.code,
      firstName: (await this.names.firstName(businessId, redemption.userId)) ?? "",
      rewardName: redemption.rewardName,
      points: redemption.points,
    });
  }
}
