import type { DessertRepository } from "../../domain/repositories/dessert-repository";
import type { Dessert } from "../../domain/entities/dessert";
import type { DessertId } from "../../domain/value-objects/dessert-id";

/**
 * In-memory adapter implementing {@link DessertRepository}, backed by a `Map`
 * keyed by the dessert id. It is the reference persistence implementation used
 * while no database is wired; a real adapter (e.g. Supabase) will implement the
 * same port without any change to the domain or application layers.
 */
export class InMemoryDessertRepository implements DessertRepository {
  private readonly store = new Map<string, Dessert>();

  constructor(initial: Dessert[] = []) {
    for (const dessert of initial) {
      this.store.set(dessert.id.value, dessert);
    }
  }

  async findById(id: DessertId): Promise<Dessert | null> {
    return this.store.get(id.value) ?? null;
  }

  async findAllAvailable(): Promise<Dessert[]> {
    return [...this.store.values()].filter((dessert) => dessert.isAvailable);
  }

  async save(dessert: Dessert): Promise<void> {
    this.store.set(dessert.id.value, dessert);
  }
}
