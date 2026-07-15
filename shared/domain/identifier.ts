/**
 * Identifier is the base for typed entity identities. It wraps a primitive
 * string value and compares by that value, so two identifiers of the same
 * concrete type holding the same value are equal. Subclasses (e.g. `DessertId`)
 * give each aggregate its own nominal id type that cannot be mixed up with
 * another aggregate's id.
 */
export abstract class Identifier {
  protected constructor(public readonly value: string) {}

  /** Structural equality: same concrete type and same underlying value. */
  equals(other?: Identifier): boolean {
    if (other === undefined || other === null) return false;
    if (other.constructor !== this.constructor) return false;
    return other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
