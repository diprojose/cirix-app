import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { OrderId } from "../value-objects/order-id";
import { CustomerInfo } from "../value-objects/customer-info";
import { DeliveryMethod } from "../value-objects/delivery-method";
import { ScheduledDate } from "../value-objects/scheduled-date";
import { canTransition, isOrderStatus, type OrderStatus } from "../value-objects/order-status";
import { OrderLine, type CreateOrderLineInput } from "./order-line";
import { PaymentReport, type RestorePaymentReportInput } from "./payment-report";
import {
  CorruptOrderSnapshotError,
  EmptyOrderError,
  InvalidDiscountError,
  InvalidOrderTransitionError,
  MixedCurrencyError,
  PaymentReportNotFoundError,
} from "../errors/ordering-errors";

/**
 * The USD→VES rate frozen into an order at placement time. Kept as plain data
 * (not the pricing context's value object) so ordering stays decoupled from
 * pricing; `null` means no rate was available when the order was placed and
 * bolívar totals are simply not shown for it.
 */
export type FrozenExchangeRate = {
  readonly vesPerUsd: number;
  readonly source: string;
  readonly asOf: string;
};

const MAX_NOTES_LENGTH = 500;

/** Props backing an {@link Order} aggregate. */
type OrderProps = {
  customer: CustomerInfo;
  lines: OrderLine[];
  delivery: DeliveryMethod;
  scheduledDate: ScheduledDate;
  notes: string;
  exchangeRate: FrozenExchangeRate | null;
  status: OrderStatus;
  payments: PaymentReport[];
  discountCents: number;
  customerUid: string | null;
  createdAt: string;
};

/** Input accepted by {@link Order.create}. Value objects arrive pre-validated. */
export type CreateOrderInput = {
  customer: CustomerInfo;
  lines: OrderLine[];
  delivery: DeliveryMethod;
  scheduledDate: ScheduledDate;
  notes?: string;
  exchangeRate: FrozenExchangeRate | null;
  customerUid?: string | null;
};

/** Input accepted by {@link Order.restore} when rehydrating persistence. */
export type RestoreOrderInput = {
  id: string;
  customerName: string;
  customerPhone: string;
  lines: CreateOrderLineInput[];
  delivery: { kind: string; zoneId: string | null; zoneName: string | null; feeCents: number };
  scheduledDate: string;
  notes: string;
  exchangeRate: FrozenExchangeRate | null;
  status: string;
  payments: RestorePaymentReportInput[];
  discountCents?: number;
  customerUid: string | null;
  createdAt: string;
};

/**
 * Order is the aggregate root of the ordering context: a made-to-order request
 * placed by a customer, with every price, delivery fee and exchange rate frozen
 * at placement time so later catalog or rate changes never alter it. It owns
 * the status machine (received → … → delivered, cancellable until delivered)
 * and the payment reports attached by the customer. Commands return a **new**
 * Order — the aggregate never mutates in place.
 */
export class Order extends AggregateRoot<OrderProps, OrderId> {
  private constructor(id: OrderId, props: OrderProps) {
    super(id, props);
  }

  /** Places a new order in `received` status, enforcing aggregate invariants. */
  static create(input: CreateOrderInput): Result<Order, DomainError> {
    if (input.lines.length === 0) {
      return err(new EmptyOrderError());
    }

    const currency = input.lines[0].currency;
    for (const line of input.lines) {
      if (line.currency !== currency) {
        return err(new MixedCurrencyError(currency, line.currency));
      }
    }

    return ok(
      new Order(OrderId.generate(), {
        customer: input.customer,
        lines: [...input.lines],
        delivery: input.delivery,
        scheduledDate: input.scheduledDate,
        notes: (input.notes ?? "").trim().slice(0, MAX_NOTES_LENGTH),
        exchangeRate: input.exchangeRate,
        status: "received",
        payments: [],
        discountCents: 0,
        customerUid: input.customerUid ?? null,
        createdAt: new Date().toISOString(),
      })
    );
  }

  /**
   * Rebuilds an order from a persisted snapshot, revalidating every part. Fails
   * with a Result so a corrupt document surfaces as an error the adapter can
   * report instead of crashing the app.
   */
  static restore(input: RestoreOrderInput): Result<Order, DomainError> {
    const customer = CustomerInfo.create({
      name: input.customerName,
      phone: input.customerPhone,
    });
    if (!customer.ok) {
      return customer;
    }

    const lines: OrderLine[] = [];
    for (const lineInput of input.lines) {
      const line = OrderLine.create(lineInput);
      if (!line.ok) {
        return line;
      }
      lines.push(line.value);
    }
    if (lines.length === 0) {
      return err(new EmptyOrderError());
    }

    const delivery = DeliveryMethod.restore(input.delivery);
    if (!delivery.ok) {
      return delivery;
    }

    const scheduledDate = ScheduledDate.create(input.scheduledDate);
    if (!scheduledDate.ok) {
      return scheduledDate;
    }

    if (!isOrderStatus(input.status)) {
      return err(new CorruptOrderSnapshotError(`Unknown order status "${input.status}".`));
    }

    const payments: PaymentReport[] = [];
    for (const paymentInput of input.payments) {
      const payment = PaymentReport.restore(paymentInput);
      if (!payment.ok) {
        return payment;
      }
      payments.push(payment.value);
    }

    return ok(
      new Order(OrderId.from(input.id), {
        customer: customer.value,
        lines,
        delivery: delivery.value,
        scheduledDate: scheduledDate.value,
        notes: input.notes,
        exchangeRate: input.exchangeRate,
        status: input.status,
        payments,
        discountCents: input.discountCents ?? 0,
        customerUid: input.customerUid,
        createdAt: input.createdAt,
      })
    );
  }

  /**
   * Attaches a customer payment report and moves the order to
   * `payment_reported`. Only allowed while the order is still awaiting payment
   * verification (`received` or `payment_reported`).
   */
  reportPayment(report: PaymentReport): Result<Order, DomainError> {
    if (!canTransition(this.props.status, "payment_reported")) {
      return err(new InvalidOrderTransitionError(this.props.status, "payment_reported"));
    }
    return ok(
      new Order(this._id, {
        ...this.props,
        payments: [...this.props.payments, report],
        status: "payment_reported",
      })
    );
  }

  /**
   * Operator review of one payment report: verified (money confirmed) or
   * rejected. The order's status is untouched — confirming the order remains a
   * separate, explicit operator decision after verification.
   */
  reviewPayment(
    paymentId: string,
    verdict: "verified" | "rejected"
  ): Result<Order, DomainError> {
    const target = this.props.payments.find((payment) => payment.id.value === paymentId);
    if (target === undefined) {
      return err(new PaymentReportNotFoundError(paymentId));
    }

    const reviewed = target.review(verdict);
    if (!reviewed.ok) {
      return reviewed;
    }

    return ok(
      new Order(this._id, {
        ...this.props,
        payments: this.props.payments.map((payment) =>
          payment.id.value === paymentId ? reviewed.value : payment
        ),
      })
    );
  }

  /**
   * Applies a wallet-credit discount to the order, set once at checkout. The
   * amount must be a whole, non-negative number of cents that does not exceed
   * the subtotal — credit can zero the goods but never the delivery fee or go
   * negative. Returns a new Order; the aggregate never mutates in place.
   */
  applyDiscount(discountCents: number): Result<Order, DomainError> {
    if (!Number.isInteger(discountCents) || discountCents < 0) {
      return err(new InvalidDiscountError("Discount must be a non-negative integer of cents."));
    }
    if (discountCents > this.subtotalCents) {
      return err(new InvalidDiscountError("Discount cannot exceed the order subtotal."));
    }
    return ok(new Order(this._id, { ...this.props, discountCents }));
  }

  /** Operator verified payment and the baker accepted the order. */
  confirm(): Result<Order, DomainError> {
    return this.transitionTo("confirmed");
  }

  /** The kitchen started working on the order. */
  startPreparing(): Result<Order, DomainError> {
    return this.transitionTo("preparing");
  }

  /** The order is ready for delivery or pickup. */
  markReady(): Result<Order, DomainError> {
    return this.transitionTo("ready");
  }

  /** The order reached the customer. Final status. */
  markDelivered(): Result<Order, DomainError> {
    return this.transitionTo("delivered");
  }

  /** Cancels the order. Allowed from any non-final status. Final status. */
  cancel(): Result<Order, DomainError> {
    return this.transitionTo("cancelled");
  }

  /** Moves to the given status when the lifecycle allows it. */
  private transitionTo(next: OrderStatus): Result<Order, DomainError> {
    if (!canTransition(this.props.status, next)) {
      return err(new InvalidOrderTransitionError(this.props.status, next));
    }
    return ok(new Order(this._id, { ...this.props, status: next }));
  }

  get customer(): CustomerInfo {
    return this.props.customer;
  }

  /** The order lines (a defensive copy — the aggregate stays immutable). */
  get lines(): readonly OrderLine[] {
    return [...this.props.lines];
  }

  get delivery(): DeliveryMethod {
    return this.props.delivery;
  }

  get scheduledDate(): ScheduledDate {
    return this.props.scheduledDate;
  }

  get notes(): string {
    return this.props.notes;
  }

  get exchangeRate(): FrozenExchangeRate | null {
    return this.props.exchangeRate;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  /** The payment reports (a defensive copy — the aggregate stays immutable). */
  get payments(): readonly PaymentReport[] {
    return [...this.props.payments];
  }

  /** Uid of the signed-in customer who placed the order, or `null` for guests. */
  get customerUid(): string | null {
    return this.props.customerUid;
  }

  /** ISO timestamp of when the order was placed. */
  get createdAt(): string {
    return this.props.createdAt;
  }

  /** The single currency shared by every line (enforced at creation). */
  get currency(): string {
    return this.props.lines[0].currency;
  }

  /** Sum of every line total, in minor units. */
  get subtotalCents(): number {
    return this.props.lines.reduce((total, line) => total + line.lineTotalCents, 0);
  }

  /**
   * Sum of every line margin (price − cost), in minor units, excluding delivery
   * and tax. This is the base the rewards context accrues a percentage of
   * (BR-01). Lines whose product had no recorded cost contribute their full
   * price as margin — capture costs to make the accrual accurate.
   */
  get marginCents(): number {
    return this.props.lines.reduce((total, line) => total + line.lineMarginCents, 0);
  }

  /** The frozen delivery fee, in minor units. */
  get deliveryFeeCents(): number {
    return this.props.delivery.feeCents;
  }

  /** Wallet credit applied to this order at checkout, in minor units. */
  get discountCents(): number {
    return this.props.discountCents;
  }

  /** Grand total: subtotal plus delivery fee, minus any credit discount. */
  get totalCents(): number {
    return this.subtotalCents + this.deliveryFeeCents - this.props.discountCents;
  }
}
