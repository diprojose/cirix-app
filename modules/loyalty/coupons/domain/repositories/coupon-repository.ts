import type { Coupon } from "../entities/coupon";
import type { CouponId } from "../value-objects/coupon-id";

/**
 * CouponRepository is the persistence port for the coupon aggregate. The domain
 * declares this contract; an infrastructure adapter implements it. `findByCode`
 * is the checkout path (customers type a code); the rest back the operator's
 * CRUD. Use cases depend on this interface, never a concrete store.
 */
export interface CouponRepository {
  /** Returns the coupon with the given id, or `null` when none exists. */
  findById(id: CouponId): Promise<Coupon | null>;

  /** Returns the coupon with the given normalized code, or `null` when none exists. */
  findByCode(code: string): Promise<Coupon | null>;

  /** Returns every coupon (the operator's list view). */
  findAll(): Promise<Coupon[]>;

  /** Inserts the coupon or replaces the existing one with the same id. */
  save(coupon: Coupon): Promise<void>;

  /** Removes the coupon with the given id (idempotent). */
  delete(id: CouponId): Promise<void>;
}
