import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { Product } from "../../domain/entities/product";
import { ProductId } from "../../domain/value-objects/product-id";
import { ProductNotFoundError } from "../../domain/errors/catalog-errors";
import { toProductDto, type ProductDto } from "../dtos/product-dto";

/** Input for {@link UpdateProduct}: the target id plus the full new state. */
export type UpdateProductInput = {
  id: string;
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
 * Replaces a catalog product's data (operator action). Full replacement rather
 * than a patch: the operator form always submits the complete state, and the
 * aggregate re-validates every invariant. Existing orders are unaffected —
 * they snapshot prices at placement time.
 */
export class UpdateProduct implements UseCase<UpdateProductInput, ProductDto> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: UpdateProductInput): Promise<Result<ProductDto, DomainError>> {
    const existing = await this.products.findById(ProductId.from(input.id));
    if (existing === null) {
      return err(new ProductNotFoundError(input.id));
    }

    const product = Product.create(input);
    if (!product.ok) {
      return product;
    }

    await this.products.save(product.value);
    return ok(toProductDto(product.value));
  }
}
