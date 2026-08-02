import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { toCouponDto, type CouponDto } from "../dtos/coupon-dto";

/** Input for {@link ListEligibleCoupons}: the customer's segment (null for guests). */
export type ListEligibleCouponsInput = { customerSegment: string | null };

/**
 * Lists the active coupons a customer may use right now — untargeted ones plus
 * those aimed at their segment (BR-14) — so the storefront can surface offers to
 * exactly the right people (US-B4). Expired and inactive coupons are excluded;
 * this is a display aid, not the authoritative check (that stays at redemption).
 */
export class ListEligibleCoupons implements UseCase<ListEligibleCouponsInput, CouponDto[]> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(input: ListEligibleCouponsInput): Promise<Result<CouponDto[], DomainError>> {
    const nowIso = new Date().toISOString();
    const all = await this.coupons.findAll();
    const eligible = all.filter((coupon) => {
      if (!coupon.isActive) return false;
      if (coupon.expiresAt !== null && coupon.expiresAt < nowIso) return false;
      if (coupon.segmentScope !== null && coupon.segmentScope !== input.customerSegment) {
        return false;
      }
      return true;
    });
    return ok(eligible.map(toCouponDto));
  }
}
