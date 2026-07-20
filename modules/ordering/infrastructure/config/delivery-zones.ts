import type { DeliveryZone } from "../../domain/value-objects/delivery-method";
import type { DeliveryZoneCatalog } from "../../domain/repositories/delivery-zone-catalog";

/**
 * The zones the business currently delivers to, with flat fees in USD cents.
 * This is the single source of truth for delivery pricing until an operator
 * screen manages zones in a later phase. Placeholder areas — adjust to the
 * business's real coverage.
 */
const DELIVERY_ZONES: DeliveryZone[] = [
  { id: "centro", name: "Centro", feeCents: 200 },
  { id: "este", name: "Este", feeCents: 300 },
  { id: "oeste", name: "Oeste", feeCents: 300 },
  { id: "sur", name: "Sur", feeCents: 350 },
];

/**
 * StaticDeliveryZoneCatalog adapts the configuration above to the
 * {@link DeliveryZoneCatalog} port. Swapping it for a database-backed catalog
 * later means touching only the DI container.
 */
export class StaticDeliveryZoneCatalog implements DeliveryZoneCatalog {
  async listAll(): Promise<DeliveryZone[]> {
    return [...DELIVERY_ZONES];
  }

  async findById(id: string): Promise<DeliveryZone | null> {
    return DELIVERY_ZONES.find((zone) => zone.id === id) ?? null;
  }
}
