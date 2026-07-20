import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { OrderId } from "../../domain/value-objects/order-id";
import { OrderNotFoundError } from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** Input for {@link ReviewPayment}: which report on which order, and the verdict. */
export type ReviewPaymentInput = {
  orderId: string;
  paymentId: string;
  verdict: "verified" | "rejected";
};

/**
 * Operator review of a customer's payment claim: after checking the bank
 * account, the operator marks the report verified or rejected. This never
 * advances the order — confirming it is a separate decision, so a verified
 * payment with an impossible delivery date can still be talked through first.
 */
export class ReviewPayment implements UseCase<ReviewPaymentInput, OrderDto> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: ReviewPaymentInput): Promise<Result<OrderDto, DomainError>> {
    const order = await this.orders.findById(OrderId.from(input.orderId));
    if (order === null) {
      return err(new OrderNotFoundError(input.orderId));
    }

    const reviewed = order.reviewPayment(input.paymentId, input.verdict);
    if (!reviewed.ok) {
      return reviewed;
    }

    await this.orders.save(reviewed.value);
    return ok(toOrderDto(reviewed.value));
  }
}
