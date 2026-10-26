import { Identifier } from "@/shared/domain/identifier";

/**
 * CustomerId identifies one person inside one business. The same Firebase user
 * becomes a different customer in each business they join, so the identity is
 * the pair (businessId, userId): two businesses never share a customer record.
 */
export class CustomerId extends Identifier {
  private constructor(
    value: string,
    readonly businessId: string,
    readonly userId: string
  ) {
    super(value);
  }

  static of(businessId: string, userId: string): CustomerId {
    return new CustomerId(`${businessId}_${userId}`, businessId, userId);
  }
}
