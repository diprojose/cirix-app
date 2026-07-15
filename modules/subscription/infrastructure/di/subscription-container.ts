import type { PremiumRequestRepository } from "../../domain/repositories/premium-request-repository";
import { InMemoryPremiumRequestRepository } from "../persistence/in-memory-premium-request-repository";
import { GetPremiumPlan } from "../../application/use-cases/get-premium-plan";
import { RequestPremiumUpgrade } from "../../application/use-cases/request-premium-upgrade";
import { PREMIUM_PLAN } from "../config/premium-plan";

/*
 * Composition root for the subscription module. This is the single place that
 * knows about concrete adapters and configuration: it instantiates the
 * repository and injects the plan and repository into use cases through their
 * constructors. Swapping persistence or the price means changing only this file.
 */

// One repository instance per server runtime.
const premiumRequestRepository: PremiumRequestRepository =
  new InMemoryPremiumRequestRepository();

/** Builds the "get premium plan" use case, wired with the configured plan. */
export const makeGetPremiumPlan = (): GetPremiumPlan =>
  new GetPremiumPlan(PREMIUM_PLAN);

/** Builds the "request premium upgrade" use case with its dependencies wired. */
export const makeRequestPremiumUpgrade = (): RequestPremiumUpgrade =>
  new RequestPremiumUpgrade(premiumRequestRepository);
