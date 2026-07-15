import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/**
 * Lists the available products flagged as featured, mapped to plain DTOs. These
 * drive the storefront's highlighted section. Depends only on the
 * {@link ProductRepository} port, received by constructor injection.
 */
export class ListFeaturedProducts implements UseCase<void, ProductDto[]> {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<Result<ProductDto[], DomainError>> {
    const products = await this.products.findAllFeatured();
    return ok(products.map(toProductDto));
  }
}
