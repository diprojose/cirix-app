import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { CouponId } from "../../domain/value-objects/coupon-id";
import { CouponNotFoundError } from "../../domain/errors/coupon-errors";
import { toCouponDto, type CouponDto } from "../dtos/coupon-dto";

/**
 * Fetches one coupon by id for the operator's edit form. Fails with a
 * not-found error when the id has no match.
 */
export class GetCouponById implements UseCase<string, CouponDto> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(id: string): Promise<Result<CouponDto, DomainError>> {
    const coupon = await this.coupons.findById(CouponId.from(id));
    if (coupon === null) {
      return err(new CouponNotFoundError(id));
    }
    return ok(toCouponDto(coupon));
  }
}
