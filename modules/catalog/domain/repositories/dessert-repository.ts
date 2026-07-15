import type { Dessert } from "../entities/dessert";
import type { DessertId } from "../value-objects/dessert-id";

/**
 * DessertRepository is the persistence port for the catalog aggregate. The
 * domain declares this contract; an infrastructure adapter implements it. Use
 * cases depend on this interface, never on a concrete store — which is what
 * makes persistence swappable (in-memory today, a database tomorrow) without
 * touching the domain or application layers.
 */
export interface DessertRepository {
  /** Returns the dessert with the given id, or `null` when none exists. */
  findById(id: DessertId): Promise<Dessert | null>;

  /** Returns every dessert currently available to order. */
  findAllAvailable(): Promise<Dessert[]>;

  /** Inserts the dessert or replaces the existing one with the same id. */
  save(dessert: Dessert): Promise<void>;
}
