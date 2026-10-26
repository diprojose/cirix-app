import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ScanTokenSigner, IssuedScanToken } from "../../domain/ports/scan-token-signer";
import type { CustomerDirectory } from "../../domain/ports/customer-directory";
import { NotACustomerError } from "../../domain/errors/stamp-card-errors";

export type IssueScanTokenInput = { businessId: string; userId: string };

/**
 * Issues the short-lived code a customer's QR shows. Only a person who joined
 * the business gets one, and always for themselves: the identity comes from the
 * session, so nobody can ask for someone else's code.
 */
export class IssueScanToken implements UseCase<IssueScanTokenInput, IssuedScanToken> {
  constructor(
    private readonly signer: ScanTokenSigner,
    private readonly customers: CustomerDirectory,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: IssueScanTokenInput): Promise<Result<IssuedScanToken, DomainError>> {
    if ((await this.customers.find(input.businessId, input.userId)) === null) {
      return err(new NotACustomerError());
    }
    return ok(this.signer.sign({ businessId: input.businessId, userId: input.userId }, this.now()));
  }
}
