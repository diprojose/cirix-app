import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { ProductId } from "../../domain/value-objects/product-id";
import { ProductNotFoundError } from "../../domain/errors/catalog-errors";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/**
 * Fetches a single product by its id, returning a {@link ProductNotFoundError}
 * failure when no match exists. Depends only on the {@link ProductRepository}
 * port, received by constructor injection.
 */
export class GetProductById implements UseCase<string, ProductDto> {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<Result<ProductDto, DomainError>> {
    const product = await this.products.findById(ProductId.from(id));
    if (product === null) {
      return err(new ProductNotFoundError(id));
    }
    return ok(toProductDto(product));
  }
}
