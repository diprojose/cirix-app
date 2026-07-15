import { Dessert, type CreateDessertInput } from "../../domain/entities/dessert";

// Sample catalog content (Spanish product data — this is domain content, not code).
const SEED_DATA: CreateDessertInput[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Torta de chocolate",
    description: "Bizcocho húmedo de chocolate con ganache.",
    priceCents: 2500,
    currency: "USD",
    available: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Cheesecake de fresa",
    description: "Base de galleta, relleno cremoso y salsa de fresa.",
    priceCents: 2200,
    currency: "USD",
    available: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Alfajores de maicena",
    description: "Rellenos de dulce de leche, por encargo.",
    priceCents: 1200,
    currency: "USD",
    available: false,
  },
];

/**
 * Builds the initial desserts used to seed the in-memory repository. An invalid
 * seed entry throws immediately at startup, surfacing the mistake early instead
 * of silently shipping bad data.
 */
export function buildDessertSeed(): Dessert[] {
  return SEED_DATA.map((seed) => {
    const result = Dessert.create(seed);
    if (!result.ok) {
      throw new Error(`Invalid dessert seed "${seed.name}": ${result.error.message}`);
    }
    return result.value;
  });
}
