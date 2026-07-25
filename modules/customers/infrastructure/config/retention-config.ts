import type { RetentionConfig } from "../../application/retention-config";

/**
 * The retention program's out-of-the-box policy: RFM thresholds (BR-21), the
 * 4-week streak paying $3 (BR-25), and a win-back of $2 (short-lived) for
 * customers quiet for 45 days, at most once a month (BR-17). Kept as a constant
 * for now; a future admin panel can make it operator-tunable.
 */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  rfm: {
    riskDays: 30,
    inactiveDays: 90,
    vipMinOrders: 5,
    vipMinSpentCents: 20000,
  },
  streak: {
    targetWeeks: 4,
    bonusCents: 300,
    bonusExpiryDays: 30,
  },
  winBack: {
    inactiveDays: 45,
    windowDays: 30,
    bonusCents: 200,
    bonusExpiryDays: 14,
  },
};
