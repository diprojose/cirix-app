import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ScanTokenSigner } from "../domain/ports/scan-token-signer";
import type { CustomerDirectory, CustomerSummary } from "../domain/ports/customer-directory";
import { InvalidScanTokenError, NotACustomerError } from "../domain/errors/stamp-card-errors";

/**
 * Turns a scanned code into the customer it names, for the business doing the
 * scan. A code signed for another business is reported exactly like a forged
 * one, so a code from one restaurant can never stamp a card in another.
 */
export async function resolveScanSubject(
  signer: ScanTokenSigner,
  customers: CustomerDirectory,
  businessId: string,
  token: string,
  now: Date
): Promise<Result<{ userId: string; customer: CustomerSummary }, DomainError>> {
  const verified = signer.verify(token, now);
  if (!verified.ok) return verified;
  if (verified.value.businessId !== businessId) return err(new InvalidScanTokenError());

  const customer = await customers.find(businessId, verified.value.userId);
  if (customer === null) return err(new NotACustomerError());
  return ok({ userId: verified.value.userId, customer });
}
