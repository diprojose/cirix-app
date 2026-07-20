import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { getAuditTrail } from "@/modules/audit/infrastructure/di/audit-container";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { FirestoreWalletLedgerRepository } from "../persistence/firestore-wallet-ledger-repository";
import { FirestoreRewardRulesStore } from "../persistence/firestore-reward-rules-store";
import { AccruePurchaseReward } from "../../application/use-cases/accrue-purchase-reward";
import { RedeemReward } from "../../application/use-cases/redeem-reward";
import { ReleaseDueRewards } from "../../application/use-cases/release-due-rewards";
import { ExpireRewards } from "../../application/use-cases/expire-rewards";
import { ReverseOrderRewards } from "../../application/use-cases/reverse-order-rewards";
import { GetWallet } from "../../application/use-cases/get-wallet";
import { AdjustBalanceManually } from "../../application/use-cases/adjust-balance-manually";
import { GetRewardRules } from "../../application/use-cases/get-reward-rules";
import { SaveRewardRules } from "../../application/use-cases/save-reward-rules";
import { GetLiabilityReport } from "../../application/use-cases/get-liability-report";
import { AccrueReferralReward } from "../../application/use-cases/accrue-referral-reward";
import { ReverseReferralReward } from "../../application/use-cases/reverse-referral-reward";
import { GrantPromotionalCredit } from "../../application/use-cases/grant-promotional-credit";

/*
 * Composition root for the rewards module. The single place that knows the
 * concrete adapters: Firestore for the ledger and the rules doc, and the audit
 * module's shared trail for sensitive actions. Adapters are created lazily so
 * importing the container needs no Firebase credentials at build time; swapping
 * persistence means changing only this file. Server-only — the ledger is never
 * touched from the client.
 */

let ledgerRepository: WalletLedgerRepository | null = null;
let rulesStore: RewardRulesStore | null = null;

function ledger(): WalletLedgerRepository {
  ledgerRepository ??= new FirestoreWalletLedgerRepository(adminFirestore());
  return ledgerRepository;
}

function rules(): RewardRulesStore {
  rulesStore ??= new FirestoreRewardRulesStore(adminFirestore());
  return rulesStore;
}

/** Builds the "accrue purchase reward" use case (earn on order confirm). */
export const makeAccruePurchaseReward = (): AccruePurchaseReward =>
  new AccruePurchaseReward(ledger(), rules());

/** Builds the "redeem reward" use case (burn at checkout). */
export const makeRedeemReward = (): RedeemReward => new RedeemReward(ledger(), rules());

/** Builds the "release due rewards" use case (holdback job). */
export const makeReleaseDueRewards = (): ReleaseDueRewards =>
  new ReleaseDueRewards(ledger());

/** Builds the "expire rewards" use case (expiry job). */
export const makeExpireRewards = (): ExpireRewards => new ExpireRewards(ledger());

/** Builds the "reverse order rewards" use case (refund/cancel). */
export const makeReverseOrderRewards = (): ReverseOrderRewards =>
  new ReverseOrderRewards(ledger());

/** Builds the "get wallet" use case (customer wallet view). */
export const makeGetWallet = (): GetWallet => new GetWallet(ledger());

/** Builds the "adjust balance manually" use case (operator, audited). */
export const makeAdjustBalanceManually = (): AdjustBalanceManually =>
  new AdjustBalanceManually(ledger(), getAuditTrail());

/** Builds the "get reward rules" use case (config read). */
export const makeGetRewardRules = (): GetRewardRules => new GetRewardRules(rules());

/** Builds the "save reward rules" use case (operator, audited). */
export const makeSaveRewardRules = (): SaveRewardRules =>
  new SaveRewardRules(rules(), getAuditTrail());

/** Builds the "get liability report" use case (points liability). */
export const makeGetLiabilityReport = (): GetLiabilityReport =>
  new GetLiabilityReport(ledger());

/** Builds the "accrue referral reward" use case (referrer credit on unlock). */
export const makeAccrueReferralReward = (): AccrueReferralReward =>
  new AccrueReferralReward(ledger(), rules());

/** Builds the "reverse referral reward" use case (claw back on 2nd-purchase cancel). */
export const makeReverseReferralReward = (): ReverseReferralReward =>
  new ReverseReferralReward(ledger());

/** Builds the "grant promotional credit" use case (streak bonus / win-back). */
export const makeGrantPromotionalCredit = (): GrantPromotionalCredit =>
  new GrantPromotionalCredit(ledger());
