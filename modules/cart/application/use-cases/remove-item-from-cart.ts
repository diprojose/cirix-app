import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CartRepository } from "../../domain/repositories/cart-repository";
import { toCartDto, type CartDto } from "../dtos/cart-dto";

/** Input to remove a product from the cart. */
export type RemoveItemFromCartInput = {
  productId: string;
};

/**
 * Removes a product from the cart, persists the result and returns the updated
 * cart. Fails when the product is not in the cart.
 */
export class RemoveItemFromCart
  implements UseCase<RemoveItemFromCartInput, CartDto>
{
  constructor(private readonly carts: CartRepository) {}

  async execute(
    input: RemoveItemFromCartInput
  ): Promise<Result<CartDto, DomainError>> {
    const cart = await this.carts.load();
    const updated = cart.removeProduct(input.productId);
    if (!updated.ok) {
      return updated;
    }
    await this.carts.save(updated.value);
    return ok(toCartDto(updated.value));
  }
}
