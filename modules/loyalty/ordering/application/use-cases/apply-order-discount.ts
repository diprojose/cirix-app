import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { OrderId } from "../../domain/value-objects/order-id";
import { OrderNotFoundError } from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** Input for {@link ApplyOrderDiscount}: the order and the credit to apply. */
export type ApplyOrderDiscountInput = {
  orderId: string;
  discountCents: number;
};

/**
 * Applies a wallet-credit discount to a placed order. It is the ordering side
 * of a redemption: the rewards context decides how much credit is actually
 * spent (clamping to balance and cap) and this use case records that amount on
 * the order so its total reflects the discount. Kept separate from placement so
 * ordering stays unaware of the rewards context — the checkout adapter wires the
 * two together.
 */
export class ApplyOrderDiscount implements UseCase<ApplyOrderDiscountInput, OrderDto> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: ApplyOrderDiscountInput): Promise<Result<OrderDto, DomainError>> {
    const order = await this.orders.findById(OrderId.from(input.orderId));
    if (order === null) {
      return err(new OrderNotFoundError(input.orderId));
    }

    const discounted = order.applyDiscount(input.discountCents);
    if (!discounted.ok) {
      return discounted;
    }

    await this.orders.save(discounted.value);
    return ok(toOrderDto(discounted.value));
  }
}
