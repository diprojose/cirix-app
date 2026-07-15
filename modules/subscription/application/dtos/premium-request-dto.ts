import type { PremiumRequest } from "../../domain/entities/premium-request";
import type { PremiumRequestStatus } from "../../domain/entities/premium-request";

/**
 * PremiumRequestDto is the plain, serializable view of a {@link PremiumRequest}.
 * Dates are exposed as ISO strings so the object is safe to send across the RSC
 * server→client boundary.
 */
export type PremiumRequestDto = {
  id: string;
  uid: string;
  email: string;
  requestedAt: string;
  status: PremiumRequestStatus;
};

/** Maps a PremiumRequest aggregate to its serializable DTO. */
export const toPremiumRequestDto = (
  request: PremiumRequest
): PremiumRequestDto => ({
  id: request.id.value,
  uid: request.uid,
  email: request.email,
  requestedAt: request.requestedAt.toISOString(),
  status: request.status,
});
