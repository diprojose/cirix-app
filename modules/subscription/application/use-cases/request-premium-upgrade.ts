import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { PremiumRequest } from "../../domain/entities/premium-request";
import { toPremiumRequestDto, type PremiumRequestDto } from "../dtos/premium-request-dto";

/** Input for {@link RequestPremiumUpgrade}: the signed-in user plus their payment claim. */
export type RequestPremiumUpgradeInput = {
  uid: string;
  email: string;
  /** Optional payment claim (method + bank reference) reported with the request. */
  payment?: { method: string; reference: string } | null;
};

/**
 * Records a signed-in user's interest in the premium plan — optionally with
 * the payment reference they already sent — so an operator can verify and
 * grant the subscription. A user with a pending request gets that request
 * back; reporting a payment attaches it to the same pending request instead
 * of duplicating it. Granting premium is deliberately out of scope here —
 * that stays an operator action.
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
      if (!input.payment) {
        return ok(toPremiumRequestDto(existing));
      }
      const updated = existing.withPayment(input.payment);
      if (!updated.ok) {
        return updated;
      }
      await this.requests.save(updated.value);
      return ok(toPremiumRequestDto(updated.value));
    }

    const result = PremiumRequest.create({
      uid: input.uid,
      email: input.email,
      payment: input.payment ?? null,
    });
    if (!result.ok) {
      return result;
    }

    await this.requests.save(result.value);
    return ok(toPremiumRequestDto(result.value));
  }
}
