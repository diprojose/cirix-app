"use server";

import { getViewer } from "@/lib/auth/dal";
import { makeGetExchangeRate } from "@/modules/loyalty/pricing/infrastructure/di/pricing-container";
import { canAccessOrder } from "@/lib/auth/order-access";
import {
  makePlaceOrder,
  makeReportPayment,
  makeApplyOrderDiscount,
  makeGetOrderById,
} from "@/modules/loyalty/ordering/infrastructure/di/ordering-container";
import {
  makeGetWallet,
  makeRedeemReward,
} from "@/modules/loyalty/rewards/infrastructure/di/rewards-container";
import {
  makeValidateCoupon,
  makeRedeemCoupon,
} from "@/modules/loyalty/coupons/infrastructure/di/coupons-container";
import { makeGetCustomerSegment } from "@/modules/loyalty/customers/infrastructure/di/customers-container";
import type { PlaceOrderItemInput } from "@/modules/loyalty/ordering/application/use-cases/place-order";

/** What the checkout form submits. Prices are intentionally absent. */
export type PlaceOrderActionInput = {
  customerName: string;
  customerPhone: string;
  items: PlaceOrderItemInput[];
  delivery: { kind: "pickup" } | { kind: "delivery"; zoneId: string };
  scheduledDate: string;
  notes?: string;
  /** When true, apply the signed-in customer's available wallet credit. */
  redeemCredit?: boolean;
  /** A coupon code to apply. Takes precedence over credit (mutual exclusion, BR-07). */
  couponCode?: string;
};

/** Serializable outcome for the client form. */
export type OrderActionResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

/** Maps stable domain error codes to the Spanish copy the form shows. */
const ERROR_MESSAGES: Record<string, string> = {
  "ordering/invalid-customer":
    "Revisa tu nombre y teléfono (ej. 0412-1234567).",
  "ordering/invalid-scheduled-date":
    "Elige una fecha de entrega válida (hoy o después).",
  "ordering/delivery-zone-not-found": "La zona de entrega seleccionada no existe.",
  "ordering/product-not-orderable":
    "Un producto de tu carrito ya no está disponible. Actualiza el carrito.",
  "ordering/empty-order": "Tu carrito está vacío.",
  "ordering/invalid-payment-report":
    "Revisa el método y el número de referencia del pago.",
  "ordering/invalid-order-transition":
    "Este pedido ya no acepta reportes de pago.",
  "ordering/order-not-found": "No encontramos este pedido.",
};

const GENERIC_ERROR = "No pudimos procesar tu pedido. Intenta de nuevo.";

/**
 * Places the order: resolves the signed-in viewer (guests may order too),
 * freezes the current BCV rate into the order and delegates to the ordering
 * use case. Returns a plain result the client form can act on.
 */
export async function placeOrderAction(
  input: PlaceOrderActionInput
): Promise<OrderActionResult> {
  const viewer = await getViewer();

  const rateResult = await makeGetExchangeRate().execute();
  const exchangeRate = rateResult.ok ? rateResult.value : null;

  const result = await makePlaceOrder().execute({
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items: input.items,
    delivery: input.delivery,
    scheduledDate: input.scheduledDate,
    notes: input.notes,
    exchangeRate,
    customerUid: viewer.authenticated ? viewer.uid : null,
  });

  if (!result.ok) {
    return { ok: false, message: ERROR_MESSAGES[result.error.code] ?? GENERIC_ERROR };
  }

  // Discount at checkout: a coupon takes precedence over wallet credit — the two
  // never stack (mutual exclusion, BR-07). Both run after placement (the order is
  // already safely created) and are best-effort: the customer saw the discount
  // validate in the preview, and a rare post-place hiccup must not lose the order.
  if (input.couponCode) {
    await applyCouponDiscount(
      input.couponCode,
      viewer.authenticated ? viewer.uid : null,
      result.value.id,
      result.value.subtotalCents
    );
  } else if (input.redeemCredit && viewer.authenticated && viewer.uid) {
    await applyWalletCredit(viewer.uid, result.value.id, result.value.subtotalCents);
  }

  return { ok: true, orderId: result.value.id };
}

/** Resolves a customer's RFM segment for coupon targeting (null for guests). */
async function resolveSegment(customerUid: string | null): Promise<string | null> {
  if (!customerUid) {
    return null;
  }
  const result = await makeGetCustomerSegment().execute({ customerUid });
  return result.ok ? result.value.segment : null;
}

/** Redeems a coupon against a placed order (atomic) and records the discount. */
async function applyCouponDiscount(
  code: string,
  customerUid: string | null,
  orderId: string,
  orderSubtotalCents: number
): Promise<void> {
  const redeemed = await makeRedeemCoupon().execute({
    code,
    customerUid,
    customerSegment: await resolveSegment(customerUid),
    orderId,
    orderSubtotalCents,
  });
  if (redeemed.ok && redeemed.value.discountCents > 0) {
    await makeApplyOrderDiscount().execute({
      orderId,
      discountCents: redeemed.value.discountCents,
    });
  }
}

/** Redeems the customer's available credit against a placed order, capped by rules. */
async function applyWalletCredit(
  customerUid: string,
  orderId: string,
  orderSubtotalCents: number
): Promise<void> {
  const walletResult = await makeGetWallet().execute({ customerUid });
  const availableCents = walletResult.ok ? walletResult.value.availableCents : 0;
  if (availableCents <= 0) {
    return;
  }

  const redeemed = await makeRedeemReward().execute({
    customerUid,
    orderId,
    requestedCents: availableCents,
    orderSubtotalCents,
  });
  if (redeemed.ok && redeemed.value.redeemedCents > 0) {
    await makeApplyOrderDiscount().execute({
      orderId,
      discountCents: redeemed.value.redeemedCents,
    });
  }
}

/** What the payment report form submits. */
export type ReportPaymentActionInput = {
  orderId: string;
  method: string;
  reference: string;
  note?: string;
};

/**
 * Records the customer's payment claim (method + reference) on their order.
 * Verification remains a manual operator step.
 *
 * `orderId` arrives from the client, so ownership is checked before anything is
 * written: knowing an order URL must never be enough to file a payment report
 * on someone else's order. Denials answer "not found" so the action never
 * confirms that an id exists.
 */
export async function reportPaymentAction(
  input: ReportPaymentActionInput
): Promise<OrderActionResult> {
  const order = await makeGetOrderById().execute({ orderId: input.orderId });
  if (!order.ok || !(await canAccessOrder(order.value.customerUid))) {
    return { ok: false, message: ERROR_MESSAGES["ordering/order-not-found"] };
  }

  const result = await makeReportPayment().execute({
    orderId: input.orderId,
    method: input.method,
    reference: input.reference,
    note: input.note,
  });

  if (!result.ok) {
    return { ok: false, message: ERROR_MESSAGES[result.error.code] ?? GENERIC_ERROR };
  }
  return { ok: true, orderId: result.value.id };
}

/** Maps coupon rejection codes to the Spanish reason the checkout shows (US-C3). */
const COUPON_ERROR_MESSAGES: Record<string, string> = {
  "coupons/not-found": "Cupón no válido o inexistente.",
  "coupons/inactive": "Este cupón no está activo.",
  "coupons/expired": "Este cupón ya expiró.",
  "coupons/min-spend-not-met": "Tu compra no alcanza el mínimo de este cupón.",
  "coupons/usage-limit-reached": "Ya usaste este cupón el máximo de veces.",
  "coupons/already-used-on-order": "Este pedido ya tiene un cupón aplicado.",
  "coupons/segment-mismatch": "Este cupón no está disponible para tu perfil.",
};

/** What the checkout coupon field submits to validate a code. */
export type ValidateCouponActionInput = {
  code: string;
  subtotalCents: number;
};

/** Serializable coupon-validation outcome for the checkout form. */
export type CouponActionResult =
  | { ok: true; code: string; discountCents: number }
  | { ok: false; message: string };

/**
 * Validates a coupon for the checkout preview: resolves the viewer (so
 * per-customer usage limits apply) and returns the discount or a clear reason.
 * It records nothing — the authoritative, atomic redemption happens when the
 * order is placed.
 */
export async function validateCouponAction(
  input: ValidateCouponActionInput
): Promise<CouponActionResult> {
  const viewer = await getViewer();
  const customerUid = viewer.authenticated ? viewer.uid : null;

  const result = await makeValidateCoupon().execute({
    code: input.code,
    customerUid,
    customerSegment: await resolveSegment(customerUid),
    orderSubtotalCents: input.subtotalCents,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: COUPON_ERROR_MESSAGES[result.error.code] ?? "No pudimos aplicar el cupón.",
    };
  }
  return { ok: true, code: result.value.code, discountCents: result.value.discountCents };
}
