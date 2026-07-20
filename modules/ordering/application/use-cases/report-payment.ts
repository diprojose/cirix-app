import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import { OrderId } from "../../domain/value-objects/order-id";
import { PaymentReport } from "../../domain/entities/payment-report";
import { OrderNotFoundError } from "../../domain/errors/ordering-errors";
import { toOrderDto, type OrderDto } from "../dtos/order-dto";

/** Input for {@link ReportPayment}: which order and what the customer paid with. */
export type ReportPaymentInput = {
  orderId: string;
  method: string;
  reference: string;
  note?: string;
};

/**
 * Attaches the customer's payment claim (method + bank reference) to an order
 * and moves it to `payment_reported`. Verification stays a separate operator
 * action — this use case records the claim, it never marks money as received.
 */
export class ReportPayment implements UseCase<ReportPaymentInput, OrderDto> {
  constructor(private readonly orders: OrderRepository) {}

  async execute(input: ReportPaymentInput): Promise<Result<OrderDto, DomainError>> {
    const order = await this.orders.findById(OrderId.from(input.orderId));
    if (order === null) {
      return err(new OrderNotFoundError(input.orderId));
    }

    const report = PaymentReport.create({
      method: input.method,
      reference: input.reference,
      note: input.note,
    });
    if (!report.ok) {
      return report;
    }

    const updated = order.reportPayment(report.value);
    if (!updated.ok) {
      return updated;
    }

    await this.orders.save(updated.value);
    return ok(toOrderDto(updated.value));
  }
}
