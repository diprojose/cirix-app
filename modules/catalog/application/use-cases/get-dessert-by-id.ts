import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { DessertRepository } from "../../domain/repositories/dessert-repository";
import { DessertId } from "../../domain/value-objects/dessert-id";
import { DessertNotFoundError } from "../../domain/errors/catalog-errors";
import { toDessertDto, type DessertDto } from "../dtos/dessert-dto";

/**
 * Fetches a single dessert by its id, returning a {@link DessertNotFoundError}
 * failure when no match exists. Depends only on the {@link DessertRepository}
 * port, received by constructor injection.
 */
export class GetDessertById implements UseCase<string, DessertDto> {
  constructor(private readonly desserts: DessertRepository) {}

  async execute(id: string): Promise<Result<DessertDto, DomainError>> {
    const dessert = await this.desserts.findById(DessertId.from(id));
    if (dessert === null) {
      return err(new DessertNotFoundError(id));
    }
    return ok(toDessertDto(dessert));
  }
}
