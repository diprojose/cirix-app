import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { OrderId } from "../../domain/value-objects/order-id";
import { OrderNotFoundError } from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** Input for {@link GetOrderById}: the order's id (from the order URL). */
export type GetOrderByIdInput = {
  orderId: string;
};

/**
 * Fetches one order for the customer-facing status page. The random uuid in
 * the URL is the guest's only credential for their order, so this use case
 * adds no further authorization — knowing the id is holding the receipt.
 */
export class GetOrderById implements UseCase<GetOrderByIdInput, OrderDto> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: GetOrderByIdInput): Promise<Result<OrderDto, DomainError>> {
    const order = await this.orders.findById(OrderId.from(input.orderId));
    if (order === null) {
      return err(new OrderNotFoundError(input.orderId));
    }
    return ok(toOrderDto(order));
  }
}
