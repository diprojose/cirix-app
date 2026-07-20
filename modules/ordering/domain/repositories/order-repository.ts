import type { Order } from "../entities/order";
import type { OrderId } from "../value-objects/order-id";

/**
 * OrderRepository is the outbound port for persisting and retrieving orders.
 * The domain owns this contract; adapters (Firestore today) implement it in the
 * infrastructure layer. Swapping the storage engine must not touch domain or
 * application code.
 */
export interface OrderRepository {
  /** Persists an order, creating it or replacing the stored version. */
  save(order: Order): Promise<void>;

  /** Finds an order by id, or `null` when it does not exist. */
  findById(id: OrderId): Promise<Order | null>;

  /** Every order, newest first (bounded by the adapter), for the operator queue. */
  findAll(): Promise<Order[]>;
}
