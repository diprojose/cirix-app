import type { FraudAlert } from "../../domain/entities/fraud-alert";
import type { FraudStatus } from "../../domain/value-objects/fraud-status";

/**
 * FraudAlertDto is the plain, serializable view of a {@link FraudAlert} for the
 * analyst's panel. Being a plain object it crosses the RSC boundary safely.
 */
export type FraudAlertDto = {
  id: string;
  subjectType: string;
  subjectId: string;
  signal: string;
  evidence: string;
  status: FraudStatus;
  createdAt: string;
};

/** Maps a FraudAlert aggregate to its serializable DTO. */
export const toFraudAlertDto = (alert: FraudAlert): FraudAlertDto => ({
  id: alert.id.value,
  subjectType: alert.subjectType,
  subjectId: alert.subjectId,
  signal: alert.signal,
  evidence: alert.evidence,
  status: alert.status,
  createdAt: alert.createdAt,
});
