import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { PremiumRequest } from "../../domain/entities/premium-request";
import { toPremiumRequestDto, type PremiumRequestDto } from "../dtos/premium-request-dto";

/** Input for {@link RequestPremiumUpgrade}: the signed-in user's uid and email. */
export type RequestPremiumUpgradeInput = {
  uid: string;
  email: string;
};

/**
 * Records a signed-in user's interest in the premium plan so an operator can
 * follow up and grant the subscription. It is idempotent: a user with a pending
 * request gets that same request back instead of a duplicate. Granting premium
 * is deliberately out of scope here — that stays an operator action.
 */
export class RequestPremiumUpgrade
  implements UseCase<RequestPremiumUpgradeInput, PremiumRequestDto>
{
  constructor(private readonly requests: PremiumRequestRepository) {}

  async execute(
    input: RequestPremiumUpgradeInput
  ): Promise<Result<PremiumRequestDto, DomainError>> {
    const existing = await this.requests.findPendingByUid(input.uid);
    if (existing) {
      return ok(toPremiumRequestDto(existing));
    }

    const result = PremiumRequest.create({
      uid: input.uid,
      email: input.email,
    });
    if (!result.ok) {
      return result;
    }

    await this.requests.save(result.value);
    return ok(toPremiumRequestDto(result.value));
  }
}
