import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { CouponId } from "../value-objects/coupon-id";
import { CouponCode } from "../value-objects/coupon-code";
import { isDiscountType, type DiscountType } from "../value-objects/discount-type";
import {
  CorruptCouponSnapshotError,
  CouponExpiredError,
  CouponInactiveError,
  InvalidCouponError,
  MinSpendNotMetError,
} from "../errors/coupon-errors";

/** Props backing a {@link Coupon} aggregate. */
type CouponProps = {
  code: CouponCode;
  discountType: DiscountType;
  value: number;
  minSpendCents: number;
  categoryScope: string[];
  segmentScope: string | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  expiresAt: string | null;
  active: boolean;
};

/** Input accepted by {@link Coupon.create}. */
export type CreateCouponInput = {
  id?: string;
  code: string;
  discountType: string;
  value: number;
  minSpendCents?: number;
  categoryScope?: string[];
  segmentScope?: string | null;
  usageLimitPerCustomer?: number | null;
  stackable?: boolean;
  expiresAt?: string | null;
  active?: boolean;
};

/** Input accepted by {@link Coupon.restore} when rehydrating persistence. */
export type RestoreCouponInput = {
  id: string;
  code: string;
  discountType: string;
  value: number;
  minSpendCents: number;
  categoryScope: string[];
  segmentScope: string | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  expiresAt: string | null;
  active: boolean;
};

/**
 * Coupon is the aggregate root of the coupons context: a targeted, conditioned
 * discount rule (BR-14) an operator publishes and a customer redeems at
 * checkout. It owns its own eligibility — {@link Coupon.evaluate} decides whether
 * an order qualifies and, if so, the discount — while cross-order concerns (the
 * per-customer usage limit BR-15, one-per-order BR-06) live in the application
 * layer, which the aggregate cannot see. `categoryScope` and `segmentScope` are
 * stored for forward compatibility but not yet enforced (segment targeting waits
 * on RFM); `minSpendCents` is the active condition.
 */
export class Coupon extends AggregateRoot<CouponProps, CouponId> {
  private constructor(id: CouponId, props: CouponProps) {
    super(id, props);
  }

  /** Builds a Coupon, validating every invariant. Fails with a Result on invalid input. */
  static create(input: CreateCouponInput): Result<Coupon, DomainError> {
    const code = CouponCode.create(input.code);
    if (!code.ok) {
      return code;
    }

    if (!isDiscountType(input.discountType)) {
      return err(new InvalidCouponError(`Unknown discount type "${input.discountType}".`));
    }

    const valueCheck = validateValue(input.discountType, input.value);
    if (!valueCheck.ok) {
      return valueCheck;
    }

    const minSpendCents = input.minSpendCents ?? 0;
    if (!Number.isInteger(minSpendCents) || minSpendCents < 0) {
      return err(new InvalidCouponError("Minimum spend must be a non-negative integer of cents."));
    }

    const usageLimitPerCustomer = input.usageLimitPerCustomer ?? null;
    if (
      usageLimitPerCustomer !== null &&
      (!Number.isInteger(usageLimitPerCustomer) || usageLimitPerCustomer < 1)
    ) {
      return err(new InvalidCouponError("Usage limit must be a whole number ≥ 1, or empty for unlimited."));
    }

    const expiresAt = input.expiresAt ?? null;
    if (expiresAt !== null && Number.isNaN(Date.parse(expiresAt))) {
      return err(new InvalidCouponError("Expiry must be a valid date."));
    }

    const id = input.id ? CouponId.from(input.id) : CouponId.generate();
    return ok(
      new Coupon(id, {
        code: code.value,
        discountType: input.discountType,
        value: input.value,
        minSpendCents,
        categoryScope: input.categoryScope ?? [],
        segmentScope: input.segmentScope ?? null,
        usageLimitPerCustomer,
        stackable: input.stackable ?? false,
        expiresAt,
        active: input.active ?? false,
      })
    );
  }

  /** Rebuilds a coupon from a persisted snapshot, revalidating enum fields. */
  static restore(input: RestoreCouponInput): Result<Coupon, DomainError> {
    const code = CouponCode.create(input.code);
    if (!code.ok) {
      return err(new CorruptCouponSnapshotError(`Invalid stored coupon code "${input.code}".`));
    }
    if (!isDiscountType(input.discountType)) {
      return err(new CorruptCouponSnapshotError(`Unknown discount type "${input.discountType}".`));
    }
    return ok(
      new Coupon(CouponId.from(input.id), {
        code: code.value,
        discountType: input.discountType,
        value: input.value,
        minSpendCents: input.minSpendCents,
        categoryScope: input.categoryScope,
        segmentScope: input.segmentScope,
        usageLimitPerCustomer: input.usageLimitPerCustomer,
        stackable: input.stackable,
        expiresAt: input.expiresAt,
        active: input.active,
      })
    );
  }

  /**
   * Evaluates the coupon against an order, returning the discount in minor units
   * when it qualifies or a specific rejection error when it does not (US-C3).
   * Covers the conditions the aggregate can judge on its own — active, not
   * expired, minimum spend — leaving usage limits and one-per-order to the
   * application layer.
   */
  evaluate(context: {
    subtotalCents: number;
    nowIso: string;
  }): Result<number, DomainError> {
    if (!this.props.active) {
      return err(new CouponInactiveError());
    }
    if (this.props.expiresAt !== null && this.props.expiresAt < context.nowIso) {
      return err(new CouponExpiredError());
    }
    if (context.subtotalCents < this.props.minSpendCents) {
      return err(new MinSpendNotMetError(this.props.minSpendCents));
    }
    return ok(this.discountFor(context.subtotalCents));
  }

  /** The discount, in minor units, this coupon yields on a given subtotal (capped at it). */
  discountFor(subtotalCents: number): number {
    const raw =
      this.props.discountType === "percentage"
        ? Math.floor((this.props.value / 100) * subtotalCents)
        : this.props.value;
    return Math.max(0, Math.min(raw, subtotalCents));
  }

  get code(): string {
    return this.props.code.value;
  }

  get discountType(): DiscountType {
    return this.props.discountType;
  }

  get value(): number {
    return this.props.value;
  }

  get minSpendCents(): number {
    return this.props.minSpendCents;
  }

  get categoryScope(): readonly string[] {
    return [...this.props.categoryScope];
  }

  get segmentScope(): string | null {
    return this.props.segmentScope;
  }

  get usageLimitPerCustomer(): number | null {
    return this.props.usageLimitPerCustomer;
  }

  get stackable(): boolean {
    return this.props.stackable;
  }

  get expiresAt(): string | null {
    return this.props.expiresAt;
  }

  get isActive(): boolean {
    return this.props.active;
  }
}

/** Validates a coupon `value` against its discount type. */
function validateValue(type: string, value: number): Result<true, DomainError> {
  if (type === "percentage") {
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return err(new InvalidCouponError("A percentage discount must be a whole number 1–100."));
    }
    return ok(true);
  }
  if (!Number.isInteger(value) || value < 1) {
    return err(new InvalidCouponError("A fixed discount must be a positive integer of cents."));
  }
  return ok(true);
}
