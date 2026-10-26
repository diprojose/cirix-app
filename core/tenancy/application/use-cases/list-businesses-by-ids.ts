import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import { toBusinessDto, type BusinessDto } from "../dtos/business-dto";

/** Maximum ids resolved in one call, a guard against unbounded reads. */
const MAX_IDS = 50;

/**
 * Resolves the public view of several businesses at once, e.g. the cards in a
 * customer's wallet. Suspended businesses are omitted and unknown ids skipped.
 */
export class ListBusinessesByIds implements UseCase<readonly string[], BusinessDto[]> {
  constructor(private readonly businesses: BusinessRepository) {}

  async execute(ids: readonly string[]): Promise<Result<BusinessDto[], DomainError>> {
    const unique = [...new Set(ids)].slice(0, MAX_IDS);
    if (unique.length === 0) return ok([]);
    const found = await this.businesses.findByIds(unique);
    return ok(found.filter((business) => business.isActive).map(toBusinessDto));
  }
}
