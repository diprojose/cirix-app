import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import type { CouponRedemptionRepository } from "../../domain/repositories/coupon-redemption-repository";
import { CouponCode } from "../../domain/value-objects/coupon-code";
import { CouponRedemption } from "../../domain/entities/coupon-redemption";
import {
  CouponAlreadyUsedOnOrderError,
  CouponNotFoundError,
  CouponUsageLimitReachedError,
} from "../../domain/errors/coupon-errors";
import type { AppliedCouponDto } from "../dtos/coupon-dto";

/** Input for {@link RedeemCoupon}: the code and the order to apply it to. */
export type RedeemCouponInput = {
  code: string;
  customerUid: string | null;
  customerSegment: string | null;
  orderId: string;
  orderSubtotalCents: number;
};

/**
 * Redeems a coupon against a placed order (UC-11): it re-validates the coupon
 * and records the redemption **atomically**, so the per-customer usage limit
 * (BR-15) and one-coupon-per-order (BR-06) hold even under concurrent
 * checkouts. Returns the discount to apply to the order, or the specific reason
 * the redemption was refused.
 */
export class RedeemCoupon implements UseCase<RedeemCouponInput, AppliedCouponDto> {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly redemptions: CouponRedemptionRepository
  ) {}

  async execute(input: RedeemCouponInput): Promise<Result<AppliedCouponDto, DomainError>> {
    const code = CouponCode.create(input.code);
    if (!code.ok) {
      return err(new CouponNotFoundError(input.code));
    }

    const coupon = await this.coupons.findByCode(code.value.value);
    if (coupon === null) {
      return err(new CouponNotFoundError(input.code));
    }

    const evaluation = coupon.evaluate({
      subtotalCents: input.orderSubtotalCents,
      nowIso: new Date().toISOString(),
      customerSegment: input.customerSegment,
    });
    if (!evaluation.ok) {
      return evaluation;
    }

    const redemption = CouponRedemption.record({
      couponId: coupon.id.value,
      customerUid: input.customerUid,
      orderId: input.orderId,
      code: coupon.code,
      discountCents: evaluation.value,
    });

    const outcome = await this.redemptions.record(
      redemption,
      coupon.usageLimitPerCustomer
    );
    if (outcome === "over-limit") {
      return err(new CouponUsageLimitReachedError());
    }
    if (outcome === "duplicate-order") {
      return err(new CouponAlreadyUsedOnOrderError());
    }

    return ok({
      couponId: coupon.id.value,
      code: coupon.code,
      discountCents: evaluation.value,
    });
  }
}
