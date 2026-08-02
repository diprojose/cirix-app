import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CartRepository } from "../../domain/repositories/cart-repository";
import { Cart } from "../../domain/entities/cart";
import { toCartDto, type CartDto } from "../dtos/cart-dto";

/**
 * Empties the cart and returns a fresh empty cart's DTO. Delegates removal of the
 * stored data to the repository so persistence stays behind the port.
 */
export class ClearCart implements UseCase<void, CartDto> {
  constructor(private readonly carts: CartRepository) {}

  async execute(): Promise<Result<CartDto, DomainError>> {
    await this.carts.clear();
    return ok(toCartDto(Cart.create()));
  }
}
