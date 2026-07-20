import type { RfmThresholds } from "../domain/value-objects/rfm-segment";

/**
 * RetentionConfig is the tunable policy of the retention program: the RFM
 * thresholds (BR-21), the weekly-streak target and its bonus (BR-25), and the
 * win-back inactivity window and its incentive (BR-17). Injected into the use
 * cases so the policy has a single source; the infrastructure layer supplies it.
 */
export type RetentionConfig = {
  rfm: RfmThresholds;
  streak: {
    targetWeeks: number;
    bonusCents: number;
    bonusExpiryDays: number;
  };
  winBack: {
    inactiveDays: number;
    windowDays: number;
    bonusCents: number;
    bonusExpiryDays: number;
  };
};
