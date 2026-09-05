import type { Order } from "../../domain/entities/order";
import type { OrderRepository } from "../../domain/repositories/order-repository";
import type { OrderId } from "../../domain/value-objects/order-id";

/** Process-local persistence used by the zero-config interactive demo. */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders: Map<string, Order>;

  constructor() {
    const runtime = globalThis as typeof globalThis & {
      __mixmagDemoOrders?: Map<string, Order>;
    };
    runtime.__mixmagDemoOrders ??= new Map<string, Order>();
    this.orders = runtime.__mixmagDemoOrders;
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.id.value, order);
  }

  async findById(id: OrderId): Promise<Order | null> {
    return this.orders.get(id.value) ?? null;
  }

  async findAll(): Promise<Order[]> {
    return [...this.orders.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 200);
  }
}
