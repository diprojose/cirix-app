import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { Coupon, type CreateCouponInput } from "../../domain/entities/coupon";
import { CouponId } from "../../domain/value-objects/coupon-id";
import { CouponNotFoundError } from "../../domain/errors/coupon-errors";
import { toCouponDto, type CouponDto } from "../dtos/coupon-dto";

/** Input for {@link UpdateCoupon}: the id plus the full new definition. */
export type UpdateCouponInput = CreateCouponInput & { id: string };

/**
 * Updates a coupon rule (UC-10). Like the catalog's update, it fully replaces
 * the aggregate through `Coupon.create`, re-validating every invariant, so an
 * edit can never leave a coupon in an invalid state. Changes apply only to
 * future redemptions — nothing already redeemed is rewritten (BR-18).
 */
export class UpdateCoupon implements UseCase<UpdateCouponInput, CouponDto> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(input: UpdateCouponInput): Promise<Result<CouponDto, DomainError>> {
    const existing = await this.coupons.findById(CouponId.from(input.id));
    if (existing === null) {
      return err(new CouponNotFoundError(input.id));
    }

    const coupon = Coupon.create(input);
    if (!coupon.ok) {
      return coupon;
    }
    await this.coupons.save(coupon.value);
    return ok(toCouponDto(coupon.value));
  }
}
