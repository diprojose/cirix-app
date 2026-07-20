import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import type { CouponRedemptionRepository } from "../../domain/repositories/coupon-redemption-repository";
import { CouponCode } from "../../domain/value-objects/coupon-code";
import {
  CouponNotFoundError,
  CouponUsageLimitReachedError,
} from "../../domain/errors/coupon-errors";
import type { AppliedCouponDto } from "../dtos/coupon-dto";

/** Input for {@link ValidateCoupon}: the code and the order context to check it against. */
export type ValidateCouponInput = {
  code: string;
  customerUid: string | null;
  orderSubtotalCents: number;
};

/**
 * Validates a coupon for the checkout preview (US-C2, US-C3): it resolves the
 * code, checks the aggregate's own conditions (active, expiry, minimum spend)
 * and the per-customer usage limit, and returns the discount it would give — or
 * a specific rejection error the UI turns into a clear reason. It records
 * nothing; {@link RedeemCoupon} is the authoritative, atomic write at placement.
 */
export class ValidateCoupon implements UseCase<ValidateCouponInput, AppliedCouponDto> {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly redemptions: CouponRedemptionRepository
  ) {}

  async execute(input: ValidateCouponInput): Promise<Result<AppliedCouponDto, DomainError>> {
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
    });
    if (!evaluation.ok) {
      return evaluation;
    }

    if (coupon.usageLimitPerCustomer !== null && input.customerUid) {
      const used = await this.redemptions.countActiveByCustomer(
        coupon.id.value,
        input.customerUid
      );
      if (used >= coupon.usageLimitPerCustomer) {
        return err(new CouponUsageLimitReachedError());
      }
    }

    return ok({
      couponId: coupon.id.value,
      code: coupon.code,
      discountCents: evaluation.value,
    });
  }
}
