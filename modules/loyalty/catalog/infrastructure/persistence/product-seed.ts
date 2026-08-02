import { Product, type CreateProductInput } from "../../domain/entities/product";

// Sample catalog content (Spanish product data — this is domain content, not
// code). The MVP catalog is fresh produce only; stock is out of scope. Images
// are local files under /public/products so they work offline and need no
// remote config.
const SEED_DATA: CreateProductInput[] = [
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Tomates",
    description: "Tomates de mesa frescos, por kilo.",
    priceCents: 300,
    costCents: 180,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/tomates.png",
    featured: true,
    available: true,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Aguacates",
    description: "Aguacates cremosos, en su punto, por unidad.",
    priceCents: 400,
    costCents: 240,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/aguacate.png",
    featured: true,
    available: true,
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    name: "Brócoli",
    description: "Brócoli fresco de temporada, por unidad.",
    priceCents: 300,
    costCents: 170,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/brocoli.png",
    available: true,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Zanahorias",
    description: "Zanahorias frescas y crujientes, por kilo.",
    priceCents: 200,
    costCents: 110,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/zanahorias.png",
    available: true,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Pimentón rojo",
    description: "Pimentón rojo dulce, ideal para cocinar, por kilo.",
    priceCents: 300,
    costCents: 180,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/pimenton-rojo.png",
    available: true,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Lechuga",
    description: "Lechuga fresca, hojas verdes y firmes, por unidad.",
    priceCents: 200,
    costCents: 120,
    currency: "USD",
    department: "supermercado",
    imageUrl: "/products/lechuga.png",
    available: true,
  },
];

/**
 * Builds the initial products used to seed the in-memory repository. An invalid
 * seed entry throws immediately at startup, surfacing the mistake early instead
 * of silently shipping bad data.
 */
export function buildProductSeed(): Product[] {
  return SEED_DATA.map((seed) => {
    const result = Product.create(seed);
    if (!result.ok) {
      throw new Error(`Invalid product seed "${seed.name}": ${result.error.message}`);
    }
    return result.value;
  });
}
