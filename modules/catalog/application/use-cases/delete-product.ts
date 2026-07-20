import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { ProductId } from "../../domain/value-objects/product-id";
import { ProductNotFoundError } from "../../domain/errors/catalog-errors";

/** Input for {@link DeleteProduct}: the id of the product to remove. */
export type DeleteProductInput = {
  id: string;
};

/**
 * Removes a product from the catalog (operator action). Placed orders keep
 * their own line snapshots, so deleting a product never corrupts order
 * history. Prefer flipping `available` off for seasonal items — deletion is
 * for genuine mistakes.
 */
export class DeleteProduct implements UseCase<DeleteProductInput, void> {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: DeleteProductInput): Promise<Result<void, DomainError>> {
    const id = ProductId.from(input.id);
    const existing = await this.products.findById(id);
    if (existing === null) {
      return err(new ProductNotFoundError(input.id));
    }

    await this.products.delete(id);
    return ok(undefined);
  }
}
