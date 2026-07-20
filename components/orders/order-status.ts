import type { OrderStatus } from "@/modules/ordering/domain/value-objects/order-status";
import type { PaymentMethod } from "@/modules/ordering/domain/value-objects/payment-method";

/** Customer-facing Spanish label for each order status. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibido",
  payment_reported: "Pago por verificar",
  confirmed: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** The happy-path progression shown in the status timeline. */
export const ORDER_STATUS_STEPS: OrderStatus[] = [
  "received",
  "payment_reported",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
];

/** Customer-facing Spanish label for each payment method. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pago_movil: "Pago Móvil",
  transferencia: "Transferencia",
  zelle: "Zelle",
  efectivo: "Efectivo",
};
