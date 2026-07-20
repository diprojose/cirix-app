import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { PremiumRequestNotFoundError } from "../../domain/errors/subscription-errors";
import { toPremiumRequestDto, type PremiumRequestDto } from "../dtos/premium-request-dto";

/** Input for {@link MarkPremiumRequestGranted}: which request was fulfilled. */
export type MarkPremiumRequestGrantedInput = {
  requestId: string;
};

/**
 * Closes a premium request after the operator granted the claim, so it leaves
 * the pending queue. Granting the claim itself is the iam context's job — the
 * admin adapter runs both, keeping each context focused on its own state.
 */
export class MarkPremiumRequestGranted
  implements UseCase<MarkPremiumRequestGrantedInput, PremiumRequestDto>
{
  constructor(private readonly requests: PremiumRequestRepository) {}

  async execute(
    input: MarkPremiumRequestGrantedInput
  ): Promise<Result<PremiumRequestDto, DomainError>> {
    const request = await this.requests.findById(input.requestId);
    if (request === null) {
      return err(new PremiumRequestNotFoundError(input.requestId));
    }

    const granted = request.markGranted();
    await this.requests.save(granted);
    return ok(toPremiumRequestDto(granted));
  }
}
