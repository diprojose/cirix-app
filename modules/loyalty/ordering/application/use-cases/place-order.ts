import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "@/modules/loyalty/catalog/domain/repositories/product-repository";
import { ProductId } from "@/modules/loyalty/catalog/domain/value-objects/product-id";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import type { DeliveryZoneCatalog } from "../../domain/repositories/delivery-zone-catalog";
import { Order, type FrozenExchangeRate } from "../../domain/entities/order";
import { OrderLine } from "../../domain/entities/order-line";
import { CustomerInfo } from "../../domain/value-objects/customer-info";
import { DeliveryMethod } from "../../domain/value-objects/delivery-method";
import { ScheduledDate } from "../../domain/value-objects/scheduled-date";
import {
  DeliveryZoneNotFoundError,
  EmptyOrderError,
  InvalidScheduledDateError,
  ProductNotOrderableError,
} from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** One requested item: which product and how many. Prices are never taken from the client. */
export type PlaceOrderItemInput = {
  productId: string;
  quantity: number;
};

/** Input for {@link PlaceOrder}: everything the checkout form collects. */
export type PlaceOrderInput = {
  customerName: string;
  customerPhone: string;
  items: PlaceOrderItemInput[];
  delivery: { kind: "pickup" } | { kind: "delivery"; zoneId: string };
  scheduledDate: string;
  notes?: string;
  exchangeRate: FrozenExchangeRate | null;
  customerUid?: string | null;
};

/**
 * Places a made-to-order purchase. The client only sends product ids and
 * quantities — names and prices are re-resolved from the catalog so a tampered
 * cart cannot buy at stale or forged prices — and the delivery fee comes from
 * the zone catalog, not the form. The exchange rate arrives from the pricing
 * context as plain data (the primary adapter wires both contexts together) and
 * is frozen into the order. The scheduled date must be today or later.
 */
export class PlaceOrder implements UseCase<PlaceOrderInput, OrderDto> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly zones: DeliveryZoneCatalog
  ) {}

  async execute(input: PlaceOrderInput): Promise<Result<OrderDto, DomainError>> {
    if (input.items.length === 0) {
      return err(new EmptyOrderError());
    }

    const customer = CustomerInfo.create({
      name: input.customerName,
      phone: input.customerPhone,
    });
    if (!customer.ok) {
      return customer;
    }

    const scheduledDate = ScheduledDate.create(input.scheduledDate);
    if (!scheduledDate.ok) {
      return scheduledDate;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (scheduledDate.value.isBefore(today)) {
      return err(new InvalidScheduledDateError("Scheduled date must be today or later."));
    }

    const delivery = await this.resolveDelivery(input.delivery);
    if (!delivery.ok) {
      return delivery;
    }

    const lines: OrderLine[] = [];
    for (const item of input.items) {
      const product = await this.products.findById(ProductId.from(item.productId));
      if (product === null || !product.isAvailable) {
        return err(new ProductNotOrderableError(item.productId));
      }

      const line = OrderLine.create({
        productId: product.id.value,
        name: product.name,
        unitPriceCents: product.price.amountCents,
        unitCostCents: product.costCents,
        currency: product.price.currency,
        imageUrl: product.imageUrl,
        quantity: item.quantity,
      });
      if (!line.ok) {
        return line;
      }
      lines.push(line.value);
    }

    const order = Order.create({
      customer: customer.value,
      lines,
      delivery: delivery.value,
      scheduledDate: scheduledDate.value,
      notes: input.notes,
      exchangeRate: input.exchangeRate,
      customerUid: input.customerUid ?? null,
    });
    if (!order.ok) {
      return order;
    }

    await this.orders.save(order.value);
    return ok(toOrderDto(order.value));
  }

  /** Maps the form's delivery choice to a validated method with a frozen fee. */
  private async resolveDelivery(
    input: PlaceOrderInput["delivery"]
  ): Promise<Result<DeliveryMethod, DomainError>> {
    if (input.kind === "pickup") {
      return ok(DeliveryMethod.pickup());
    }

    const zone = await this.zones.findById(input.zoneId);
    if (zone === null) {
      return err(new DeliveryZoneNotFoundError(input.zoneId));
    }
    return DeliveryMethod.delivery(zone);
  }
}
