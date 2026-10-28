import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { StampProgram } from "../../domain/value-objects/stamp-program";
import { toStampProgramDto, type StampProgramDto } from "../dtos/stamp-card-dto";

/** Reads a business's stamp rules, or the defaults when it has not set any. */
export class GetStampProgram implements UseCase<string, StampProgramDto> {
  constructor(private readonly programs: StampProgramRepository) {}

  async execute(businessId: string): Promise<Result<StampProgramDto, DomainError>> {
    return ok(toStampProgramDto(await this.programs.get(businessId)));
  }
}

export type SaveStampProgramInput = {
  businessId: string;
  requiredStamps: number;
  rewardName: string;
  cooldownMinutes: number;
  active?: boolean;
  tableStamps?: boolean;
};

/**
 * Saves a business's stamp rules after validating them. Changes apply to future
 * stamps only: cards in progress keep what they already collected.
 */
export class SaveStampProgram implements UseCase<SaveStampProgramInput, StampProgramDto> {
  constructor(private readonly programs: StampProgramRepository) {}

  async execute(input: SaveStampProgramInput): Promise<Result<StampProgramDto, DomainError>> {
    const program = StampProgram.create(input);
    if (!program.ok) return program;
    await this.programs.save(input.businessId, program.value);
    return ok(toStampProgramDto(program.value));
  }
}
