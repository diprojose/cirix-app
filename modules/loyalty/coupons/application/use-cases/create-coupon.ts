import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { Coupon, type CreateCouponInput } from "../../domain/entities/coupon";
import { toCouponDto, type CouponDto } from "../dtos/coupon-dto";

/** Input for {@link CreateCoupon}: a new coupon definition (no id). */
export type CreateCouponUseCaseInput = Omit<CreateCouponInput, "id">;

/**
 * Creates a coupon rule (US-C1). The aggregate validates every invariant; a
 * coupon is born inactive by default so it only takes effect once the operator
 * publishes it. This use case just persists the validated aggregate.
 */
export class CreateCoupon implements UseCase<CreateCouponUseCaseInput, CouponDto> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(input: CreateCouponUseCaseInput): Promise<Result<CouponDto, DomainError>> {
    const coupon = Coupon.create(input);
    if (!coupon.ok) {
      return coupon;
    }
    await this.coupons.save(coupon.value);
    return ok(toCouponDto(coupon.value));
  }
}
