import type { DessertRepository } from "../../domain/repositories/dessert-repository";
import { InMemoryDessertRepository } from "../persistence/in-memory-dessert-repository";
import { buildDessertSeed } from "../persistence/dessert-seed";
import { ListAvailableDesserts } from "../../application/use-cases/list-available-desserts";
import { GetDessertById } from "../../application/use-cases/get-dessert-by-id";

/*
 * Composition root for the catalog module. This is the single place that knows
 * about concrete adapters: it instantiates the repository implementation and
 * injects it into use cases through their constructors (dependency inversion in
 * action). Swapping persistence means changing only this file.
 */

// One repository instance per server runtime, seeded once at module load.
const dessertRepository: DessertRepository = new InMemoryDessertRepository(buildDessertSeed());

/** Builds the "list available desserts" use case with its dependencies wired. */
export const makeListAvailableDesserts = (): ListAvailableDesserts =>
  new ListAvailableDesserts(dessertRepository);

/** Builds the "get dessert by id" use case with its dependencies wired. */
export const makeGetDessertById = (): GetDessertById =>
  new GetDessertById(dessertRepository);
