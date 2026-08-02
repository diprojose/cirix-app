import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { toCouponDto, type CouponDto } from "../dtos/coupon-dto";

/**
 * Lists every coupon for the operator's management view (US-C1). Returns plain
 * DTOs so the admin page renders without touching domain types.
 */
export class ListCoupons implements UseCase<void, CouponDto[]> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(): Promise<Result<CouponDto[], DomainError>> {
    const coupons = await this.coupons.findAll();
    return ok(coupons.map(toCouponDto));
  }
}
