import type { Identifier } from "./identifier";

/**
 * Entity is the base for domain objects defined by a stable identity rather
 * than by their attributes. Two entities are equal when they share the same id,
 * even if their other properties have diverged over time.
 */
export abstract class Entity<
  TProps extends object,
  TId extends Identifier = Identifier,
> {
  protected readonly _id: TId;
  protected readonly props: TProps;

  protected constructor(id: TId, props: TProps) {
    this._id = id;
    this.props = props;
  }

  /** The entity's identity. */
  get id(): TId {
    return this._id;
  }

  /** Identity equality: same concrete type and equal id. */
  equals(other?: Entity<TProps, TId>): boolean {
    if (other === undefined || other === null) return false;
    if (other.constructor !== this.constructor) return false;
    return this._id.equals(other._id);
  }
}
