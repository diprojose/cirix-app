import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CartRepository } from "../../domain/repositories/cart-repository";
import { toCartDto, type CartDto } from "../dtos/cart-dto";

/** Input to set an existing line's quantity. */
export type ChangeItemQuantityInput = {
  productId: string;
  quantity: number;
};

/**
 * Sets the quantity of a product already in the cart, persists the result and
 * returns the updated cart. Fails when the product is absent or the quantity is
 * out of range.
 */
export class ChangeItemQuantity
  implements UseCase<ChangeItemQuantityInput, CartDto>
{
  constructor(private readonly carts: CartRepository) {}

  async execute(
    input: ChangeItemQuantityInput
  ): Promise<Result<CartDto, DomainError>> {
    const cart = await this.carts.load();
    const updated = cart.changeQuantity(input.productId, input.quantity);
    if (!updated.ok) {
      return updated;
    }
    await this.carts.save(updated.value);
    return ok(toCartDto(updated.value));
  }
}
