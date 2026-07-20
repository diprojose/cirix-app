import type { Order, FrozenExchangeRate } from "../../domain/entities/order";
import type { OrderStatus } from "../../domain/value-objects/order-status";
import type { DeliveryKind } from "../../domain/value-objects/delivery-method";
import type { PaymentMethod } from "../../domain/value-objects/payment-method";
import type { PaymentReportStatus } from "../../domain/entities/payment-report";

/** One order line as plain data. */
export type OrderLineDto = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl: string;
  quantity: number;
  lineTotalCents: number;
};

/** One payment report as plain data. */
export type PaymentReportDto = {
  id: string;
  method: PaymentMethod;
  reference: string;
  note: string;
  reportedAt: string;
  status: PaymentReportStatus;
};

/**
 * OrderDto is the plain, serializable view of an {@link Order} exposed by use
 * cases. Being a plain object it can safely cross the RSC server→client
 * boundary and be rendered by any adapter without leaking domain types.
 */
export type OrderDto = {
  id: string;
  customerName: string;
  customerPhone: string;
  lines: OrderLineDto[];
  delivery: {
    kind: DeliveryKind;
    zoneId: string | null;
    zoneName: string | null;
    feeCents: number;
  };
  scheduledDate: string;
  notes: string;
  exchangeRate: FrozenExchangeRate | null;
  status: OrderStatus;
  payments: PaymentReportDto[];
  customerUid: string | null;
  createdAt: string;
  currency: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
};

/** Maps an Order aggregate to its serializable DTO. */
export const toOrderDto = (order: Order): OrderDto => ({
  id: order.id.value,
  customerName: order.customer.name,
  customerPhone: order.customer.phone,
  lines: order.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    currency: line.currency,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
    lineTotalCents: line.lineTotalCents,
  })),
  delivery: {
    kind: order.delivery.kind,
    zoneId: order.delivery.zoneId,
    zoneName: order.delivery.zoneName,
    feeCents: order.delivery.feeCents,
  },
  scheduledDate: order.scheduledDate.value,
  notes: order.notes,
  exchangeRate: order.exchangeRate,
  status: order.status,
  payments: order.payments.map((payment) => ({
    id: payment.id.value,
    method: payment.method,
    reference: payment.reference,
    note: payment.note,
    reportedAt: payment.reportedAt,
    status: payment.status,
  })),
  customerUid: order.customerUid,
  createdAt: order.createdAt,
  currency: order.currency,
  subtotalCents: order.subtotalCents,
  deliveryFeeCents: order.deliveryFeeCents,
  totalCents: order.totalCents,
});
