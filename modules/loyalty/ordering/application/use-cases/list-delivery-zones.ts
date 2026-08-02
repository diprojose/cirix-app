import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { DeliveryZoneCatalog } from "../../domain/repositories/delivery-zone-catalog";
import type { DeliveryZone } from "../../domain/value-objects/delivery-method";

/**
 * Lists the delivery zones the business currently services, for the checkout
 * form's zone picker. `DeliveryZone` is already plain serializable data, so it
 * crosses the RSC boundary as-is.
 */
export class ListDeliveryZones implements UseCase<void, DeliveryZone[]> {
  constructor(private readonly zones: DeliveryZoneCatalog) {}

  async execute(): Promise<Result<DeliveryZone[], DomainError>> {
    return ok(await this.zones.listAll());
  }
}
