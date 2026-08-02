import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import { toWalletDto, type WalletDto } from "../dtos/wallet-dto";

/** Input for {@link GetWallet}: whose wallet to read. */
export type GetWalletInput = { customerUid: string };

/**
 * Returns a customer's wallet — folded available/pending balances, next expiry
 * and full line history (US-A1, US-A2). Isolation is enforced by the caller
 * always passing the authenticated viewer's own uid; the use case never trusts
 * a client-supplied id, which is how mixmag achieves the spec's per-customer
 * isolation without database row-level security.
 */
export class GetWallet implements UseCase<GetWalletInput, WalletDto> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(input: GetWalletInput): Promise<Result<WalletDto, DomainError>> {
    const entries = await this.ledger.findByCustomer(input.customerUid);
    return ok(toWalletDto(entries));
  }
}
