import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { Product } from "../../domain/entities/product";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/** Input for {@link CreateProduct}: everything the operator's form collects. */
export type CreateProductInput = {
  name: string;
  description: string;
  priceCents: number;
  currency?: string;
  department: string;
  imageUrl?: string;
  featured?: boolean;
  available?: boolean;
};

/**
 * Creates a new catalog product (operator action). The aggregate validates
 * every invariant (name, price, department); this use case only persists the
 * valid result.
 */
export class CreateProduct implements UseCase<CreateProductInput, ProductDto> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<Result<ProductDto, DomainError>> {
    const product = Product.create(input);
    if (!product.ok) {
      return product;
    }

    await this.products.save(product.value);
    return ok(toProductDto(product.value));
  }
}
