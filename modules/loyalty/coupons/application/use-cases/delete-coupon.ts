import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import { CouponId } from "../../domain/value-objects/coupon-id";
import { CouponNotFoundError } from "../../domain/errors/coupon-errors";

/** Input for {@link DeleteCoupon}: the coupon id. */
export type DeleteCouponInput = { id: string };

/**
 * Deletes a coupon (operator action; prefer deactivating for anything already
 * shared). Past redemptions are untouched — they live in their own collection —
 * so deleting a coupon does not rewrite history.
 */
export class DeleteCoupon implements UseCase<DeleteCouponInput, void> {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(input: DeleteCouponInput): Promise<Result<void, DomainError>> {
    const existing = await this.coupons.findById(CouponId.from(input.id));
    if (existing === null) {
      return err(new CouponNotFoundError(input.id));
    }
    await this.coupons.delete(CouponId.from(input.id));
    return ok(undefined);
  }
}
