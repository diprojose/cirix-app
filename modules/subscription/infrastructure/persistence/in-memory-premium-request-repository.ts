import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import type { PremiumRequest } from "../../domain/entities/premium-request";

/**
 * In-memory adapter implementing {@link PremiumRequestRepository}, backed by a
 * `Map` keyed by the request id. It is the reference persistence implementation
 * used while no database is wired; a real adapter will implement the same port
 * without any change to the domain or application layers.
 *
 * Note: being in-memory, requests are lost on server restart — enough to
 * demonstrate the flow, to be replaced by a durable store for the operator
 * queue.
 */
export class InMemoryPremiumRequestRepository
  implements PremiumRequestRepository
{
  private readonly store = new Map<string, PremiumRequest>();

  async save(request: PremiumRequest): Promise<void> {
    this.store.set(request.id.value, request);
  }

  async findById(id: string): Promise<PremiumRequest | null> {
    return this.store.get(id) ?? null;
  }

  async findPendingByUid(uid: string): Promise<PremiumRequest | null> {
    for (const request of this.store.values()) {
      if (request.uid === uid && request.status === "pending") {
        return request;
      }
    }
    return null;
  }

  async findAllPending(): Promise<PremiumRequest[]> {
    return [...this.store.values()].filter(
      (request) => request.status === "pending"
    );
  }
}
