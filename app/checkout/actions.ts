"use server";

import { getViewer } from "@/lib/auth/dal";
import { makeGetExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import {
  makePlaceOrder,
  makeReportPayment,
} from "@/modules/ordering/infrastructure/di/ordering-container";
import type { PlaceOrderItemInput } from "@/modules/ordering/application/use-cases/place-order";

/** What the checkout form submits. Prices are intentionally absent. */
export type PlaceOrderActionInput = {
  customerName: string;
  customerPhone: string;
  items: PlaceOrderItemInput[];
  delivery: { kind: "pickup" } | { kind: "delivery"; zoneId: string };
  scheduledDate: string;
  notes?: string;
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
  return { ok: true, orderId: result.value.id };
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
 */
export async function reportPaymentAction(
  input: ReportPaymentActionInput
): Promise<OrderActionResult> {
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
