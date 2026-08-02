import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferralCodeRepository } from "../../domain/repositories/referral-code-repository";
import type { ReferrerRewarder } from "../../domain/ports/referrer-rewarder";
import { FirestoreReferralRepository } from "../persistence/firestore-referral-repository";
import { FirestoreReferralCodeRepository } from "../persistence/firestore-referral-code-repository";
import { RewardsReferrerRewarder } from "../adapters/rewards-referrer-rewarder";
import { DEFAULT_REFERRAL_CONFIG } from "../config/referral-config";
import { GetOrCreateReferralLink } from "../../application/use-cases/get-or-create-referral-link";
import { RegisterReferral } from "../../application/use-cases/register-referral";
import { RecordReferredPurchase } from "../../application/use-cases/record-referred-purchase";
import { GetMyReferrals } from "../../application/use-cases/get-my-referrals";
import { ReverseReferralOnOrderCancel } from "../../application/use-cases/reverse-referral-on-order-cancel";
import { BlockReferral } from "../../application/use-cases/block-referral";
import { GetReferralFunnel } from "../../application/use-cases/get-referral-funnel";

/*
 * Composition root for the referrals module. The single place that knows the
 * concrete adapters: Firestore for referrals and codes, and the rewards-backed
 * rewarder that pays referrers. Adapters are created lazily so importing the
 * container needs no Firebase credentials at build time. Server-only.
 */

let referralRepository: ReferralRepository | null = null;
let codeRepository: ReferralCodeRepository | null = null;
let rewarder: ReferrerRewarder | null = null;

function referrals(): ReferralRepository {
  referralRepository ??= new FirestoreReferralRepository(adminFirestore());
  return referralRepository;
}

function codes(): ReferralCodeRepository {
  codeRepository ??= new FirestoreReferralCodeRepository(adminFirestore());
  return codeRepository;
}

function referrerRewarder(): ReferrerRewarder {
  rewarder ??= new RewardsReferrerRewarder();
  return rewarder;
}

/** Builds the "get or create referral link" use case (referrer's own link). */
export const makeGetOrCreateReferralLink = (): GetOrCreateReferralLink =>
  new GetOrCreateReferralLink(codes());

/** Builds the "register referral" use case (bind a new signup to a referrer). */
export const makeRegisterReferral = (): RegisterReferral =>
  new RegisterReferral(referrals(), codes());

/** Builds the "record referred purchase" use case (advance on order confirm). */
export const makeRecordReferredPurchase = (): RecordReferredPurchase =>
  new RecordReferredPurchase(referrals(), referrerRewarder(), DEFAULT_REFERRAL_CONFIG);

/** Builds the "get my referrals" use case (referrer panel). */
export const makeGetMyReferrals = (): GetMyReferrals => new GetMyReferrals(referrals());

/** Builds the "reverse referral on order cancel" use case. */
export const makeReverseReferralOnOrderCancel = (): ReverseReferralOnOrderCancel =>
  new ReverseReferralOnOrderCancel(referrals(), referrerRewarder());

/** Builds the "block referral" use case (fraud review). */
export const makeBlockReferral = (): BlockReferral =>
  new BlockReferral(referrals(), referrerRewarder());

/** Builds the "get referral funnel" use case (KPIs). */
export const makeGetReferralFunnel = (): GetReferralFunnel =>
  new GetReferralFunnel(referrals());
