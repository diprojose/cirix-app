import type { Product } from "../entities/product";
import type { ProductId } from "../value-objects/product-id";

/**
 * ProductRepository is the persistence port for the catalog aggregate. The
 * domain declares this contract; an infrastructure adapter implements it. Use
 * cases depend on this interface, never on a concrete store — which is what
 * makes persistence swappable (in-memory today, a database tomorrow) without
 * touching the domain or application layers.
 */
export interface ProductRepository {
  /** Returns the product with the given id, or `null` when none exists. */
  findById(id: ProductId): Promise<Product | null>;

  /** Returns every product currently available to order. */
  findAllAvailable(): Promise<Product[]>;

  /** Returns every available product flagged as featured. */
  findAllFeatured(): Promise<Product[]>;

  /** Returns every product, available or not (the operator's catalog view). */
  findAll(): Promise<Product[]>;

  /** Inserts the product or replaces the existing one with the same id. */
  save(product: Product): Promise<void>;

  /** Removes the product with the given id (idempotent). */
  delete(id: ProductId): Promise<void>;
}
