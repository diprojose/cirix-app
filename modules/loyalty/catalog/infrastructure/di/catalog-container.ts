import {
  adminFirestore,
  hasFirebaseAdminConfig,
} from "@/shared/infrastructure/firebase-admin";
import type { ProductRepository } from "../../domain/repositories/product-repository";
import { FirestoreProductRepository } from "../persistence/firestore-product-repository";
import { buildProductSeed } from "../persistence/product-seed";
import { ListAvailableProducts } from "../../application/use-cases/list-available-products";
import { ListFeaturedProducts } from "../../application/use-cases/list-featured-products";
import { GetProductById } from "../../application/use-cases/get-product-by-id";
import { ListAllProducts } from "../../application/use-cases/list-all-products";
import { CreateProduct } from "../../application/use-cases/create-product";
import { UpdateProduct } from "../../application/use-cases/update-product";
import { DeleteProduct } from "../../application/use-cases/delete-product";
import { InMemoryProductRepository } from "../persistence/in-memory-product-repository";

/*
 * Composition root for the catalog module. This is the single place that knows
 * about concrete adapters: it instantiates the repository implementation and
 * injects it into use cases through their constructors (dependency inversion in
 * action). Swapping persistence means changing only this file — the in-memory
 * adapter remains available as the reference implementation.
 */

let productRepository: ProductRepository | null = null;

/** The Firestore-backed catalog, created lazily so importing the container does
 * not require Firebase credentials at build time. Seeds the initial catalog on
 * an empty collection. */
function repository(): ProductRepository {
  productRepository ??= hasFirebaseAdminConfig()
    ? new FirestoreProductRepository(adminFirestore(), buildProductSeed())
    : new InMemoryProductRepository(buildProductSeed());
  return productRepository;
}

/** Builds the "list available products" use case with its dependencies wired. */
export const makeListAvailableProducts = (): ListAvailableProducts =>
  new ListAvailableProducts(repository());

/** Builds the "list featured products" use case with its dependencies wired. */
export const makeListFeaturedProducts = (): ListFeaturedProducts =>
  new ListFeaturedProducts(repository());

/** Builds the "get product by id" use case with its dependencies wired. */
export const makeGetProductById = (): GetProductById =>
  new GetProductById(repository());

/** Builds the "list all products" use case (operator catalog view). */
export const makeListAllProducts = (): ListAllProducts =>
  new ListAllProducts(repository());

/** Builds the "create product" use case (operator action). */
export const makeCreateProduct = (): CreateProduct => new CreateProduct(repository());

/** Builds the "update product" use case (operator action). */
export const makeUpdateProduct = (): UpdateProduct => new UpdateProduct(repository());

/** Builds the "delete product" use case (operator action). */
export const makeDeleteProduct = (): DeleteProduct => new DeleteProduct(repository());

/**
 * Exposes the catalog's repository to other composition roots (e.g. ordering
 * re-prices order lines from the catalog). Only DI containers may call this —
 * application code keeps depending on the port through its own constructor.
 */
export const getProductRepository = (): ProductRepository => repository();
