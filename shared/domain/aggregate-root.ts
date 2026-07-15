import { Entity } from "./entity";
import type { Identifier } from "./identifier";

/**
 * AggregateRoot marks the single entry-point entity of an aggregate — the only
 * object outside code may hold a reference to, and the consistency boundary for
 * the aggregate's invariants. Domain-event recording is reserved to live here
 * in a future iteration; for now it behaves exactly like an `Entity`.
 */
export abstract class AggregateRoot<
  TProps extends object,
  TId extends Identifier = Identifier,
> extends Entity<TProps, TId> {
  // Reserved for a future domain-events iteration:
  //   private readonly _domainEvents: DomainEvent[] = [];
  //   protected addDomainEvent(event: DomainEvent): void { ... }
  //   pullDomainEvents(): DomainEvent[] { ... }
}
