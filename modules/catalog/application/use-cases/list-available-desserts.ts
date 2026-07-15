import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { DessertRepository } from "../../domain/repositories/dessert-repository";
import { toDessertDto, type DessertDto } from "../dtos/dessert-dto";

/**
 * Lists every dessert currently available to order, mapped to plain DTOs ready
 * for the UI. Depends only on the {@link DessertRepository} port, received by
 * constructor injection.
 */
export class ListAvailableDesserts implements UseCase<void, DessertDto[]> {
  constructor(private readonly desserts: DessertRepository) {}

  async execute(): Promise<Result<DessertDto[], DomainError>> {
    const desserts = await this.desserts.findAllAvailable();
    return ok(desserts.map(toDessertDto));
  }
}
