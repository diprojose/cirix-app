import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { FirestorePremiumRequestRepository } from "../persistence/firestore-premium-request-repository";
import { GetPremiumPlan } from "../../application/use-cases/get-premium-plan";
import { RequestPremiumUpgrade } from "../../application/use-cases/request-premium-upgrade";
import { ListPendingPremiumRequests } from "../../application/use-cases/list-pending-premium-requests";
import { MarkPremiumRequestGranted } from "../../application/use-cases/mark-premium-request-granted";
import { PREMIUM_PLAN } from "../config/premium-plan";

/*
 * Composition root for the subscription module. This is the single place that
 * knows about concrete adapters and configuration: it instantiates the
 * repository and injects the plan and repository into use cases through their
 * constructors. Swapping persistence or the price means changing only this
 * file — the in-memory adapter remains available as the reference
 * implementation.
 */

let premiumRequestRepository: PremiumRequestRepository | null = null;

/** The Firestore-backed request repository, created lazily so importing the
 * container does not require Firebase credentials at build time. */
function repository(): PremiumRequestRepository {
  premiumRequestRepository ??= new FirestorePremiumRequestRepository(adminFirestore());
  return premiumRequestRepository;
}

/** Builds the "get premium plan" use case, wired with the configured plan. */
export const makeGetPremiumPlan = (): GetPremiumPlan =>
  new GetPremiumPlan(PREMIUM_PLAN);

/** Builds the "request premium upgrade" use case with its dependencies wired. */
export const makeRequestPremiumUpgrade = (): RequestPremiumUpgrade =>
  new RequestPremiumUpgrade(repository());

/** Builds the "list pending premium requests" use case (operator queue). */
export const makeListPendingPremiumRequests = (): ListPendingPremiumRequests =>
  new ListPendingPremiumRequests(repository());

/** Builds the "mark premium request granted" use case (operator action). */
export const makeMarkPremiumRequestGranted = (): MarkPremiumRequestGranted =>
  new MarkPremiumRequestGranted(repository());
