import type { ProductRepository } from "../../domain/repositories/product-repository";
import { InMemoryProductRepository } from "../persistence/in-memory-product-repository";
import { buildProductSeed } from "../persistence/product-seed";
import { ListAvailableProducts } from "../../application/use-cases/list-available-products";
import { ListFeaturedProducts } from "../../application/use-cases/list-featured-products";
import { GetProductById } from "../../application/use-cases/get-product-by-id";

/*
 * Composition root for the catalog module. This is the single place that knows
 * about concrete adapters: it instantiates the repository implementation and
 * injects it into use cases through their constructors (dependency inversion in
 * action). Swapping persistence means changing only this file.
 */

// One repository instance per server runtime, seeded once at module load.
const productRepository: ProductRepository = new InMemoryProductRepository(buildProductSeed());

/** Builds the "list available products" use case with its dependencies wired. */
export const makeListAvailableProducts = (): ListAvailableProducts =>
  new ListAvailableProducts(productRepository);

/** Builds the "list featured products" use case with its dependencies wired. */
export const makeListFeaturedProducts = (): ListFeaturedProducts =>
  new ListFeaturedProducts(productRepository);

/** Builds the "get product by id" use case with its dependencies wired. */
export const makeGetProductById = (): GetProductById =>
  new GetProductById(productRepository);
