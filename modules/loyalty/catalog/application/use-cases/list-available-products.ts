import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/**
 * Lists every product currently available to order, mapped to plain DTOs ready
 * for the UI. Depends only on the {@link ProductRepository} port, received by
 * constructor injection.
 */
export class ListAvailableProducts implements UseCase<void, ProductDto[]> {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<Result<ProductDto[], DomainError>> {
    const products = await this.products.findAllAvailable();
    return ok(products.map(toProductDto));
  }
}
