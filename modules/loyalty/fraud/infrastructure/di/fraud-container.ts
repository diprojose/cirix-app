import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { getAuditTrail } from "@/core/audit/infrastructure/di/audit-container";
import type { FraudAlertRepository } from "../../domain/repositories/fraud-alert-repository";
import type { ReferralModerator } from "../../domain/ports/referral-moderator";
import { FirestoreFraudAlertRepository } from "../persistence/firestore-fraud-alert-repository";
import { ReferralsReferralModerator } from "../adapters/referrals-referral-moderator";
import { RaiseFraudAlert } from "../../application/use-cases/raise-fraud-alert";
import { ListPendingFraudAlerts } from "../../application/use-cases/list-pending-fraud-alerts";
import { ResolveFraudAlert } from "../../application/use-cases/resolve-fraud-alert";

/*
 * Composition root for the fraud module. The single place that knows the
 * concrete adapters: Firestore for alerts, the referrals-backed moderator, and
 * the shared audit trail. Adapters are created lazily so importing the container
 * needs no Firebase credentials at build time. Server-only.
 */

let alertRepository: FraudAlertRepository | null = null;
let moderator: ReferralModerator | null = null;

function alerts(): FraudAlertRepository {
  alertRepository ??= new FirestoreFraudAlertRepository(adminFirestore());
  return alertRepository;
}

function referralModerator(): ReferralModerator {
  moderator ??= new ReferralsReferralModerator();
  return moderator;
}

/** Builds the "raise fraud alert" use case (operator flags a subject). */
export const makeRaiseFraudAlert = (): RaiseFraudAlert => new RaiseFraudAlert(alerts());

/** Builds the "list pending fraud alerts" use case (analyst queue). */
export const makeListPendingFraudAlerts = (): ListPendingFraudAlerts =>
  new ListPendingFraudAlerts(alerts());

/** Builds the "resolve fraud alert" use case (approve/block, audited). */
export const makeResolveFraudAlert = (): ResolveFraudAlert =>
  new ResolveFraudAlert(alerts(), referralModerator(), getAuditTrail());
