import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import { BusinessNotFoundError, BusinessSuspendedError } from "../../domain/errors/tenancy-errors";
import { toBusinessDto, type BusinessDto } from "../dtos/business-dto";

/**
 * Resolves the public view of an active business from its slug: the landing
 * page behind a QR code. Suspended or unknown businesses are reported as such.
 */
export class GetBusinessBySlug implements UseCase<string, BusinessDto> {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(slug: string): Promise<Result<BusinessDto, DomainError>> {
    const business = await this.businesses.findBySlug(slug.trim().toLowerCase());
    if (business === null) return err(new BusinessNotFoundError(slug));
    if (!business.isActive) return err(new BusinessSuspendedError());
    return ok(toBusinessDto(business));
  }
}
