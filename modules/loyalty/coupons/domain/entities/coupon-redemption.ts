import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CorruptCouponSnapshotError } from "../errors/coupon-errors";

/** A redemption is live (`recorded`) or clawed back by a refund (`reversed`). */
export type RedemptionStatus = "recorded" | "reversed";

/** Props backing a {@link CouponRedemption}. */
type CouponRedemptionProps = {
  couponId: string;
  customerUid: string | null;
  orderId: string;
  code: string;
  discountCents: number;
  status: RedemptionStatus;
  createdAt: string;
};

/** Input accepted by {@link CouponRedemption.restore}. */
export type RestoreCouponRedemptionInput = {
  couponId: string;
  customerUid: string | null;
  orderId: string;
  code: string;
  discountCents: number;
  status: string;
  createdAt: string;
};

/**
 * CouponRedemption is the record of one coupon being used on one order — the
 * append-only fact that ties a coupon, a customer and an order together and
 * that the per-customer usage limit is counted from (BR-15). It is identified in
 * persistence by its order id (one coupon per order, BR-06). A refund does not
 * delete it; it flips its status to `reversed`, freeing the use and keeping the
 * history auditable (BR-12).
 */
export class CouponRedemption {
  private constructor(private readonly props: CouponRedemptionProps) {}

  /** Records a fresh, live redemption stamped with the current time. */
  static record(input: {
    couponId: string;
    customerUid: string | null;
    orderId: string;
    code: string;
    discountCents: number;
  }): CouponRedemption {
    return new CouponRedemption({
      couponId: input.couponId,
      customerUid: input.customerUid,
      orderId: input.orderId,
      code: input.code,
      discountCents: input.discountCents,
      status: "recorded",
      createdAt: new Date().toISOString(),
    });
  }

  /** Rebuilds a redemption from a persisted snapshot, revalidating its status. */
  static restore(input: RestoreCouponRedemptionInput): Result<CouponRedemption, DomainError> {
    if (input.status !== "recorded" && input.status !== "reversed") {
      return err(new CorruptCouponSnapshotError(`Unknown redemption status "${input.status}".`));
    }
    return ok(new CouponRedemption({ ...input, status: input.status }));
  }

  /** Marks this redemption reversed (a refund freed the use). */
  reverse(): CouponRedemption {
    return new CouponRedemption({ ...this.props, status: "reversed" });
  }

  get couponId(): string {
    return this.props.couponId;
  }

  get customerUid(): string | null {
    return this.props.customerUid;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get code(): string {
    return this.props.code;
  }

  get discountCents(): number {
    return this.props.discountCents;
  }

  get status(): RedemptionStatus {
    return this.props.status;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  /** Whether this redemption still counts toward the usage limit. */
  get isActive(): boolean {
    return this.props.status === "recorded";
  }
}
