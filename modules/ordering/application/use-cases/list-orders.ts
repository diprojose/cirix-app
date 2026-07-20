import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/**
 * Lists every order, newest first, for the operator's queue. Authorization
 * (operator only) is enforced by the primary adapter's guard before this use
 * case runs.
 */
export class ListOrders implements UseCase<void, OrderDto[]> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(): Promise<Result<OrderDto[], DomainError>> {
    const orders = await this.orders.findAll();
    return ok(orders.map(toOrderDto));
  }
}
