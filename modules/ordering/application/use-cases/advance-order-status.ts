import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { Order } from "../../domain/entities/order";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { OrderId } from "../../domain/value-objects/order-id";
import { OrderNotFoundError } from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** The lifecycle commands an operator can issue on an order. */
export type OrderAction = "confirm" | "preparing" | "ready" | "delivered" | "cancel";

/** Input for {@link AdvanceOrderStatus}: which order and which lifecycle command. */
export type AdvanceOrderStatusInput = {
  orderId: string;
  action: OrderAction;
};

/**
 * Executes one operator lifecycle command on an order (confirm, start
 * preparing, mark ready/delivered, cancel). The aggregate's status machine
 * decides whether the move is legal from the current status — this use case
 * only routes the command and persists the outcome.
 */
export class AdvanceOrderStatus implements UseCase<AdvanceOrderStatusInput, OrderDto> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(
    input: AdvanceOrderStatusInput
  ): Promise<Result<OrderDto, DomainError>> {
    const order = await this.orders.findById(OrderId.from(input.orderId));
    if (order === null) {
      return err(new OrderNotFoundError(input.orderId));
    }

    const advanced = applyAction(order, input.action);
    if (!advanced.ok) {
      return advanced;
    }

    await this.orders.save(advanced.value);
    return ok(toOrderDto(advanced.value));
  }
}

/** Maps an action name to the corresponding aggregate command. */
function applyAction(order: Order, action: OrderAction): Result<Order, DomainError> {
  switch (action) {
    case "confirm":
      return order.confirm();
    case "preparing":
      return order.startPreparing();
    case "ready":
      return order.markReady();
    case "delivered":
      return order.markDelivered();
    case "cancel":
      return order.cancel();
  }
}
