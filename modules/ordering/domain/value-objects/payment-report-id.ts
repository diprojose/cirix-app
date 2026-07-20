import { Identifier } from "@/shared/domain/identifier";

/**
 * PaymentReportId is the typed identity of a {@link PaymentReport} entity,
 * unique within its owning order.
 */
export class PaymentReportId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): PaymentReportId {
    return new PaymentReportId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): PaymentReportId {
    return new PaymentReportId(crypto.randomUUID());
  }
}
