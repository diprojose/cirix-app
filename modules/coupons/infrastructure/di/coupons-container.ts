import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { CouponRepository } from "../../domain/repositories/coupon-repository";
import type { CouponRedemptionRepository } from "../../domain/repositories/coupon-redemption-repository";
import { FirestoreCouponRepository } from "../persistence/firestore-coupon-repository";
import { FirestoreCouponRedemptionRepository } from "../persistence/firestore-coupon-redemption-repository";
import { CreateCoupon } from "../../application/use-cases/create-coupon";
import { UpdateCoupon } from "../../application/use-cases/update-coupon";
import { DeleteCoupon } from "../../application/use-cases/delete-coupon";
import { ListCoupons } from "../../application/use-cases/list-coupons";
import { GetCouponById } from "../../application/use-cases/get-coupon-by-id";
import { ValidateCoupon } from "../../application/use-cases/validate-coupon";
import { RedeemCoupon } from "../../application/use-cases/redeem-coupon";
import { ReverseCouponRedemption } from "../../application/use-cases/reverse-coupon-redemption";
import { ListEligibleCoupons } from "../../application/use-cases/list-eligible-coupons";

/*
 * Composition root for the coupons module. The single place that knows the
 * concrete adapters: Firestore for coupon definitions and for the atomic usage
 * ledger. Adapters are created lazily so importing the container needs no
 * Firebase credentials at build time; swapping persistence means changing only
 * this file. Server-only.
 */

let couponRepository: CouponRepository | null = null;
let redemptionRepository: CouponRedemptionRepository | null = null;

function coupons(): CouponRepository {
  couponRepository ??= new FirestoreCouponRepository(adminFirestore());
  return couponRepository;
}

function redemptions(): CouponRedemptionRepository {
  redemptionRepository ??= new FirestoreCouponRedemptionRepository(adminFirestore());
  return redemptionRepository;
}

/** Builds the "create coupon" use case (operator action). */
export const makeCreateCoupon = (): CreateCoupon => new CreateCoupon(coupons());

/** Builds the "update coupon" use case (operator action). */
export const makeUpdateCoupon = (): UpdateCoupon => new UpdateCoupon(coupons());

/** Builds the "delete coupon" use case (operator action). */
export const makeDeleteCoupon = (): DeleteCoupon => new DeleteCoupon(coupons());

/** Builds the "list coupons" use case (operator list view). */
export const makeListCoupons = (): ListCoupons => new ListCoupons(coupons());

/** Builds the "get coupon by id" use case (operator edit form). */
export const makeGetCouponById = (): GetCouponById => new GetCouponById(coupons());

/** Builds the "validate coupon" use case (checkout preview). */
export const makeValidateCoupon = (): ValidateCoupon =>
  new ValidateCoupon(coupons(), redemptions());

/** Builds the "redeem coupon" use case (atomic, at placement). */
export const makeRedeemCoupon = (): RedeemCoupon =>
  new RedeemCoupon(coupons(), redemptions());

/** Builds the "reverse coupon redemption" use case (on order cancel). */
export const makeReverseCouponRedemption = (): ReverseCouponRedemption =>
  new ReverseCouponRedemption(redemptions());

/** Builds the "list eligible coupons" use case (segment-targeted offers). */
export const makeListEligibleCoupons = (): ListEligibleCoupons =>
  new ListEligibleCoupons(coupons());
