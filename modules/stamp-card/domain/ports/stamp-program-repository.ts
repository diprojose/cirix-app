import type { StampProgram } from "../value-objects/stamp-program";

/** Persistence port for each business's stamp program rules. */
export interface StampProgramRepository {
  /** The business's program, or the defaults when it never configured one. */
  get(businessId: string): Promise<StampProgram>;

  save(businessId: string, program: StampProgram): Promise<void>;
}
