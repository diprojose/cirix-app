import type { DeliveryZone } from "../value-objects/delivery-method";

/**
 * DeliveryZoneCatalog is the outbound port for the serviced delivery areas and
 * their fees. Today an adapter backs it with static configuration; an operator
 * screen will manage zones in a later phase without touching this contract.
 */
export interface DeliveryZoneCatalog {
  /** Every zone the business currently delivers to. */
  listAll(): Promise<DeliveryZone[]>;

  /** Finds a zone by id, or `null` when it is not serviced. */
  findById(id: string): Promise<DeliveryZone | null>;
}
