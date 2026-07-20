import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { toPremiumRequestDto, type PremiumRequestDto } from "../dtos/premium-request-dto";

/**
 * Lists the premium upgrade requests still awaiting an operator, oldest first,
 * for the admin panel's queue.
 */
export class ListPendingPremiumRequests implements UseCase<void, PremiumRequestDto[]> {
  constructor(private readonly requests: PremiumRequestRepository) {}

  async execute(): Promise<Result<PremiumRequestDto[], DomainError>> {
    const pending = await this.requests.findAllPending();
    return ok(pending.map(toPremiumRequestDto));
  }
}
