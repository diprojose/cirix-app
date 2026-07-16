import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CartRepository } from "../../domain/repositories/cart-repository";
import { toCartDto, type CartDto } from "../dtos/cart-dto";

/**
 * Loads the current cart. Returns an empty cart's DTO when nothing is stored yet.
 * Depends only on the {@link CartRepository} port, received by constructor
 * injection.
 */
export class GetCart implements UseCase<void, CartDto> {
  constructor(private readonly carts: CartRepository) {}

  async execute(): Promise<Result<CartDto, DomainError>> {
    const cart = await this.carts.load();
    return ok(toCartDto(cart));
  }
}
