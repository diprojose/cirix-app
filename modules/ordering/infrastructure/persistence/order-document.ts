import type { Order, RestoreOrderInput } from "../../domain/entities/order";

/** Bumped whenever the persisted shape changes, so old documents can be migrated. */
export const ORDER_DOCUMENT_VERSION = 1;

/**
 * OrderDocument is the versioned Firestore shape of an order — distinct from
 * `OrderDto` (the view model) because persistence and presentation evolve
 * independently. It is exactly the primitives `Order.restore` expects, plus a
 * version tag. Every optional domain value is stored as an explicit `null`
 * (Firestore rejects `undefined`).
 */
export type OrderDocument = Omit<RestoreOrderInput, "id"> & {
  version: number;
};

/** Serializes an Order aggregate into its Firestore document. */
export const toOrderDocument = (order: Order): OrderDocument => ({
  version: ORDER_DOCUMENT_VERSION,
  customerName: order.customer.name,
  customerPhone: order.customer.phone,
  lines: order.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    unitPriceCents: line.unitPriceCents,
    currency: line.currency,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
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
});

/** Adapts a stored document into the input expected by `Order.restore`. */
export const documentToRestoreInput = (
  id: string,
  document: OrderDocument
): RestoreOrderInput => ({
  id,
  customerName: document.customerName,
  customerPhone: document.customerPhone,
  lines: document.lines,
  delivery: document.delivery,
  scheduledDate: document.scheduledDate,
  notes: document.notes,
  exchangeRate: document.exchangeRate,
  status: document.status,
  payments: document.payments,
  customerUid: document.customerUid,
  createdAt: document.createdAt,
});
