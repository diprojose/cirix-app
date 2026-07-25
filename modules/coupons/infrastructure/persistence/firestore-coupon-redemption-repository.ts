import type { Firestore } from "firebase-admin/firestore";
import { CouponRedemption } from "../../domain/entities/coupon-redemption";
import type {
  CouponRedemptionRepository,
  RecordRedemptionOutcome,
} from "../../domain/repositories/coupon-redemption-repository";

/** One document per order-level redemption, keyed by order id (one per order). */
const REDEMPTIONS = "coupon_redemptions";
/** One counter per (coupon, customer), keyed by a composite id. */
const COUNTERS = "coupon_usage_counters";

/** The Firestore shape of a redemption. */
type RedemptionDocument = {
  couponId: string;
  customerUid: string | null;
  orderId: string;
  code: string;
  discountCents: number;
  status: string;
  createdAt: string;
};

/** The Firestore shape of a per-customer usage counter. */
type CounterDocument = {
  couponId: string;
  customerUid: string;
  count: number;
  updatedAt: string;
};

/** Composite key for a customer's usage counter of one coupon. */
const counterKey = (couponId: string, customerUid: string): string =>
  `${couponId}__${customerUid}`;

/**
 * FirestoreCouponRedemptionRepository is the production adapter for the
 * {@link CouponRedemptionRepository} port. It is the consistency boundary for
 * coupon usage: `record` runs in a transaction that reads the order slot and the
 * per-customer counter before writing, so one-per-order (BR-06) and the usage
 * limit (BR-15) hold under concurrency without composite indexes. The order id
 * keys the redemption document; a `<couponId>__<uid>` counter tracks per-customer
 * uses so a limit check is a single-document read, not a query.
 */
export class FirestoreCouponRedemptionRepository implements CouponRedemptionRepository {
  constructor(private readonly firestore: Firestore) {}

  async findByOrder(orderId: string): Promise<CouponRedemption | null> {
    const snapshot = await this.firestore.collection(REDEMPTIONS).doc(orderId).get();
    if (!snapshot.exists) {
      return null;
    }
    return restore(snapshot.data() as RedemptionDocument);
  }

  async countActiveByCustomer(couponId: string, customerUid: string): Promise<number> {
    const snapshot = await this.firestore
      .collection(COUNTERS)
      .doc(counterKey(couponId, customerUid))
      .get();
    return snapshot.exists ? (snapshot.data() as CounterDocument).count : 0;
  }

  async record(
    redemption: CouponRedemption,
    usageLimitPerCustomer: number | null
  ): Promise<RecordRedemptionOutcome> {
    const orderRef = this.firestore.collection(REDEMPTIONS).doc(redemption.orderId);
    const tracksUsage =
      redemption.customerUid !== null && usageLimitPerCustomer !== null;
    const counterRef = tracksUsage
      ? this.firestore
          .collection(COUNTERS)
          .doc(counterKey(redemption.couponId, redemption.customerUid as string))
      : null;

    return this.firestore.runTransaction(async (tx) => {
      // All reads first (Firestore requires reads before writes).
      const orderSnap = await tx.get(orderRef);
      const counterSnap = counterRef ? await tx.get(counterRef) : null;

      if (orderSnap.exists) {
        return "duplicate-order";
      }

      let currentCount = 0;
      if (counterRef && usageLimitPerCustomer !== null) {
        currentCount = counterSnap?.exists
          ? (counterSnap.data() as CounterDocument).count
          : 0;
        if (currentCount >= usageLimitPerCustomer) {
          return "over-limit";
        }
      }

      tx.set(orderRef, toDocument(redemption));
      if (counterRef) {
        const counter: CounterDocument = {
          couponId: redemption.couponId,
          customerUid: redemption.customerUid as string,
          count: currentCount + 1,
          updatedAt: new Date().toISOString(),
        };
        tx.set(counterRef, counter);
      }
      return "recorded";
    });
  }

  async reverseByOrder(orderId: string): Promise<boolean> {
    const orderRef = this.firestore.collection(REDEMPTIONS).doc(orderId);

    return this.firestore.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        return false;
      }
      const data = orderSnap.data() as RedemptionDocument;
      if (data.status !== "recorded") {
        return false;
      }

      const counterRef =
        data.customerUid !== null
          ? this.firestore
              .collection(COUNTERS)
              .doc(counterKey(data.couponId, data.customerUid))
          : null;
      const counterSnap = counterRef ? await tx.get(counterRef) : null;

      tx.update(orderRef, { status: "reversed" });
      if (counterRef && counterSnap?.exists) {
        const current = (counterSnap.data() as CounterDocument).count;
        tx.update(counterRef, {
          count: Math.max(0, current - 1),
          updatedAt: new Date().toISOString(),
        });
      }
      return true;
    });
  }
}

/** Serializes a redemption into its Firestore document. */
function toDocument(redemption: CouponRedemption): RedemptionDocument {
  return {
    couponId: redemption.couponId,
    customerUid: redemption.customerUid,
    orderId: redemption.orderId,
    code: redemption.code,
    discountCents: redemption.discountCents,
    status: redemption.status,
    createdAt: redemption.createdAt,
  };
}

/** Rebuilds a redemption from a stored document, failing loudly on corrupt data. */
function restore(document: RedemptionDocument): CouponRedemption {
  const result = CouponRedemption.restore(document);
  if (!result.ok) {
    throw new Error(`Corrupt redemption for order "${document.orderId}": ${result.error.message}`);
  }
  return result.value;
}
