import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRedemptionRepository } from "../../domain/repositories/coupon-redemption-repository";

/** Input for {@link ReverseCouponRedemption}: the cancelled/refunded order. */
export type ReverseCouponRedemptionInput = { orderId: string };

/** Whether a live redemption was reversed. */
export type ReverseCouponSummary = { reversed: boolean };

/**
 * Reverses the coupon used on an order when the order is cancelled (BR-12,
 * UC-12): it frees the customer's use and marks the redemption reversed rather
 * than deleting it, keeping the record auditable. Idempotent — reversing an
 * order with no live coupon redemption is a harmless no-op.
 */
export class ReverseCouponRedemption
  implements UseCase<ReverseCouponRedemptionInput, ReverseCouponSummary>
{
  constructor(private readonly redemptions: CouponRedemptionRepository) {}

  async execute(
    input: ReverseCouponRedemptionInput
  ): Promise<Result<ReverseCouponSummary, DomainError>> {
    const reversed = await this.redemptions.reverseByOrder(input.orderId);
    return ok({ reversed });
  }
}
