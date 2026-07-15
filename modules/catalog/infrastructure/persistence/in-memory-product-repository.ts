import type { ProductRepository } from "../../domain/repositories/product-repository";
import type { Product } from "../../domain/entities/product";
import type { ProductId } from "../../domain/value-objects/product-id";

/**
 * In-memory adapter implementing {@link ProductRepository}, backed by a `Map`
 * keyed by the product id. It is the reference persistence implementation used
 * while no database is wired; a real adapter (e.g. Supabase) will implement the
 * same port without any change to the domain or application layers.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, Product>();

  constructor(initial: Product[] = []) {
    for (const product of initial) {
      this.store.set(product.id.value, product);
    }
  }

  async findById(id: ProductId): Promise<Product | null> {
    return this.store.get(id.value) ?? null;
  }

  async findAllAvailable(): Promise<Product[]> {
    return [...this.store.values()].filter((product) => product.isAvailable);
  }

  async findAllFeatured(): Promise<Product[]> {
    return [...this.store.values()].filter(
      (product) => product.isAvailable && product.isFeatured
    );
  }

  async save(product: Product): Promise<void> {
    this.store.set(product.id.value, product);
  }
}
