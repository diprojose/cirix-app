import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { TableCode, TableCodeRepository } from "../../domain/ports/table-code-repository";

/** The code to print in a business's table QR (owner only). */
export class GetTableCode implements UseCase<string, TableCode> {
  constructor(private readonly codes: TableCodeRepository) {}

  async execute(businessId: string): Promise<Result<TableCode, DomainError>> {
    return ok(await this.codes.current(businessId));
  }
}

/**
 * Issues a new table code (owner only). Every QR printed with the old code stops
 * giving stamps at once, so this is the answer to a leaked photo of the QR.
 * Signup still works with an old QR: only the stamp needs the current code.
 */
export class RotateTableCode implements UseCase<string, TableCode> {
  constructor(private readonly codes: TableCodeRepository) {}

  async execute(businessId: string): Promise<Result<TableCode, DomainError>> {
    return ok(await this.codes.rotate(businessId));
  }
}
