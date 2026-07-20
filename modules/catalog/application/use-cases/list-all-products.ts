import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/**
 * Lists the whole catalog — available and hidden products alike — for the
 * operator's management view. The public storefront keeps using
 * `ListAvailableProducts`, which filters by availability.
 */
export class ListAllProducts implements UseCase<void, ProductDto[]> {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<Result<ProductDto[], DomainError>> {
    const products = await this.products.findAll();
    return ok(products.map(toProductDto));
  }
}
