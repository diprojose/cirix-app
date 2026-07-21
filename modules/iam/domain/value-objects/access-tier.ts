import { ValueObject } from "@/shared/domain/value-object";

/**
 * The access modes the product supports, ordered from least to most capable.
 * `guest` browses without an account, `customer` has signed in and can place
 * orders, and `operator` runs the store (order queue, catalog, rewards).
 */
export type AccessTierName = "guest" | "customer" | "operator";

/** Props backing an {@link AccessTier} value object. */
type AccessTierProps = {
  name: AccessTierName;
};

/**
 * AccessTier is the value object that encapsulates the app's authorization
 * rules. It answers what a viewer at a given tier is allowed to do
 * ({@link AccessTier.canPlaceOrders}, {@link AccessTier.canOperateStore}) so the
 * business rules of the three access modes live in one place in the domain,
 * never scattered across the delivery layer.
 */
export class AccessTier extends ValueObject<AccessTierProps> {
  private constructor(props: AccessTierProps) {
    super(props);
  }

  /** The tier for an unauthenticated visitor. */
  static guest(): AccessTier {
    return new AccessTier({ name: "guest" });
  }

  /** The tier for a signed-in user. */
  static customer(): AccessTier {
    return new AccessTier({ name: "customer" });
  }

  /** The tier for the business staff who operate the store. */
  static operator(): AccessTier {
    return new AccessTier({ name: "operator" });
  }

  /** Builds a tier from its stored name. */
  static fromName(name: AccessTierName): AccessTier {
    return new AccessTier({ name });
  }

  get name(): AccessTierName {
    return this.props.name;
  }

  /** Whether a viewer at this tier may place orders. */
  canPlaceOrders(): boolean {
    return this.props.name !== "guest";
  }

  /** Whether a viewer at this tier may run the store's admin panel. */
  canOperateStore(): boolean {
    return this.props.name === "operator";
  }
}
