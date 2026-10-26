import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ScanTokenSigner } from "../../domain/ports/scan-token-signer";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import type { StampCardRepository } from "../../domain/ports/stamp-card-repository";
import type { StampProgramRepository } from "../../domain/ports/stamp-program-repository";
import { resolveScanSubject } from "../resolve-scan-subject";
import { toStampCardDto, type StampCardDto } from "../dtos/stamp-card-dto";

export type ScanInput = { businessId: string; token: string };

export type ScanPreview = { firstName: string; card: StampCardDto };

/**
 * Shows staff who they just scanned and what they may do (stamp, redeem, or
 * wait), without changing anything. It exists so an accidental scan never adds
 * a stamp: staff look first, then confirm.
 */
export class PreviewScan implements UseCase<ScanInput, ScanPreview> {
  constructor(
    private readonly signer: ScanTokenSigner,
    private readonly customers: CustomerDirectory,
    private readonly cards: StampCardRepository,
    private readonly programs: StampProgramRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: ScanInput): Promise<Result<ScanPreview, DomainError>> {
    const now = this.now();
    const subject = await resolveScanSubject(this.signer, this.customers, input.businessId, input.token, now);
    if (!subject.ok) return subject;

    const [program, card] = await Promise.all([
      this.programs.get(input.businessId),
      this.cards.find(input.businessId, subject.value.userId),
    ]);
    return ok({
      firstName: subject.value.customer.firstName,
      card: toStampCardDto(card, program, input.businessId, subject.value.userId, now),
    });
  }
}
