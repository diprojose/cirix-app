import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { PromotionalCreditGranter } from "../../domain/ports/promotional-credit-granter";
import { FirestoreCustomerProfileRepository } from "../persistence/firestore-customer-profile-repository";
import { RewardsPromotionalCreditGranter } from "../adapters/rewards-promotional-credit-granter";
import { DEFAULT_RETENTION_CONFIG } from "../config/retention-config";
import { RecordConfirmedOrder } from "../../application/use-cases/record-confirmed-order";
import { RecalculateSegments } from "../../application/use-cases/recalculate-segments";
import { GenerateWinBack } from "../../application/use-cases/generate-win-back";
import { GetCustomerSegment } from "../../application/use-cases/get-customer-segment";
import { GetCustomerProfile } from "../../application/use-cases/get-customer-profile";

/*
 * Composition root for the customers (retention) module. The single place that
 * knows the concrete adapters: Firestore for profiles and the rewards-backed
 * granter that pays streak/win-back bonuses. Adapters are created lazily so
 * importing the container needs no Firebase credentials at build time. Server-only.
 */

let profileRepository: CustomerProfileRepository | null = null;
let granter: PromotionalCreditGranter | null = null;

function profiles(): CustomerProfileRepository {
  profileRepository ??= new FirestoreCustomerProfileRepository(adminFirestore());
  return profileRepository;
}

function promotionalGranter(): PromotionalCreditGranter {
  granter ??= new RewardsPromotionalCreditGranter();
  return granter;
}

/** Builds the "record confirmed order" use case (retention update on confirm). */
export const makeRecordConfirmedOrder = (): RecordConfirmedOrder =>
  new RecordConfirmedOrder(profiles(), promotionalGranter(), DEFAULT_RETENTION_CONFIG);

/** Builds the "recalculate segments" use case (periodic RFM demotion). */
export const makeRecalculateSegments = (): RecalculateSegments =>
  new RecalculateSegments(profiles(), DEFAULT_RETENTION_CONFIG);

/** Builds the "generate win-back" use case (periodic reactivation). */
export const makeGenerateWinBack = (): GenerateWinBack =>
  new GenerateWinBack(profiles(), promotionalGranter(), DEFAULT_RETENTION_CONFIG);

/** Builds the "get customer segment" use case (coupon/offer targeting). */
export const makeGetCustomerSegment = (): GetCustomerSegment =>
  new GetCustomerSegment(profiles());

/** Builds the "get customer profile" use case (storefront progress). */
export const makeGetCustomerProfile = (): GetCustomerProfile =>
  new GetCustomerProfile(profiles(), DEFAULT_RETENTION_CONFIG);
