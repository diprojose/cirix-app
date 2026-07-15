/**
 * ValueObject is the base for immutable domain values compared by structure
 * rather than identity (e.g. `Money`). Two value objects are equal when their
 * props are deeply equal. Props are frozen on construction and must hold plain,
 * JSON-serializable data.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  /** Structural equality based on a deep comparison of props. */
  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
