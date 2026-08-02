import type { RfmSegment } from "../../domain/value-objects/rfm-segment";

/**
 * CustomerProfileDto is the plain, serializable view of a customer's retention
 * standing for the storefront (their segment and streak progress toward the next
 * bonus). It carries the streak target too, so the UI can render a progress bar
 * without knowing the program config (US-B7).
 */
export type CustomerProfileDto = {
  segment: RfmSegment;
  orderCount: number;
  streakWeeks: number;
  streakTargetWeeks: number;
};

/** A customer's current segment, for coupon eligibility and offer targeting. */
export type CustomerSegmentDto = {
  segment: RfmSegment;
};
