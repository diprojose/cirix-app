import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidDeliveryError } from "../errors/ordering-errors";

/** How an order reaches the customer. */
export type DeliveryKind = "pickup" | "delivery";

/** A serviced delivery area with its flat fee (in the order's currency, minor units). */
export type DeliveryZone = {
  readonly id: string;
  readonly name: string;
  readonly feeCents: number;
};

/** Props backing a {@link DeliveryMethod} value object. */
type DeliveryMethodProps = {
  readonly kind: DeliveryKind;
  readonly zoneId: string | null;
  readonly zoneName: string | null;
  readonly feeCents: number;
};

/**
 * DeliveryMethod captures how an order is fulfilled: free pickup at the shop,
 * or delivery to one of the configured zones with that zone's flat fee frozen
 * into the order (a later fee change must not alter an existing order). The
 * zone snapshot (id + name) travels with the order so the operator sees where
 * to send it without a lookup.
 */
export class DeliveryMethod extends ValueObject<DeliveryMethodProps> {
  private constructor(props: DeliveryMethodProps) {
    super(props);
  }

  /** Pickup at the shop: always free, no zone. */
  static pickup(): DeliveryMethod {
    return new DeliveryMethod({ kind: "pickup", zoneId: null, zoneName: null, feeCents: 0 });
  }

  /** Delivery to a zone, freezing the zone's current fee. */
  static delivery(zone: DeliveryZone): Result<DeliveryMethod, DomainError> {
    if (zone.id.trim().length === 0 || zone.name.trim().length === 0) {
      return err(new InvalidDeliveryError("Delivery zone requires an id and a name."));
    }
    if (!Number.isInteger(zone.feeCents) || zone.feeCents < 0) {
      return err(
        new InvalidDeliveryError("Delivery fee must be a non-negative integer in cents.")
      );
    }
    return ok(
      new DeliveryMethod({
        kind: "delivery",
        zoneId: zone.id.trim(),
        zoneName: zone.name.trim(),
        feeCents: zone.feeCents,
      })
    );
  }

  /** Rebuilds a delivery method from persisted primitives. */
  static restore(input: {
    kind: string;
    zoneId: string | null;
    zoneName: string | null;
    feeCents: number;
  }): Result<DeliveryMethod, DomainError> {
    if (input.kind === "pickup") {
      return ok(DeliveryMethod.pickup());
    }
    if (input.kind === "delivery") {
      if (input.zoneId === null || input.zoneName === null) {
        return err(new InvalidDeliveryError("Persisted delivery method is missing its zone."));
      }
      return DeliveryMethod.delivery({
        id: input.zoneId,
        name: input.zoneName,
        feeCents: input.feeCents,
      });
    }
    return err(new InvalidDeliveryError(`Unknown delivery kind "${input.kind}".`));
  }

  get kind(): DeliveryKind {
    return this.props.kind;
  }

  get zoneId(): string | null {
    return this.props.zoneId;
  }

  get zoneName(): string | null {
    return this.props.zoneName;
  }

  get feeCents(): number {
    return this.props.feeCents;
  }
}
