import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CartRepository } from "../../domain/repositories/cart-repository";
import { toCartDto, type CartDto } from "../dtos/cart-dto";

/** Input to add (or increment) a product in the cart — a flat product snapshot. */
export type AddItemToCartInput = {
  productId: string;
  name: string;
  unitPriceCents: number;
  currency: string;
  imageUrl?: string;
  quantity: number;
};

/**
 * Adds a product to the cart (merging into an existing line when present),
 * persists the result and returns the updated cart. Business failures — an
 * invalid quantity or a currency that clashes with the cart — come back as a
 * `Result` error, not an exception.
 */
export class AddItemToCart implements UseCase<AddItemToCartInput, CartDto> {
  constructor(private readonly carts: CartRepository) {}

  async execute(input: AddItemToCartInput): Promise<Result<CartDto, DomainError>> {
    const cart = await this.carts.load();
    const updated = cart.addProduct(input);
    if (!updated.ok) {
      return updated;
    }
    await this.carts.save(updated.value);
    return ok(toCartDto(updated.value));
  }
}
