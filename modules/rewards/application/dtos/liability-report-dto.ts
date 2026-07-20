/**
 * LiabilityReportDto is the plain, serializable snapshot of the program's
 * outstanding credit — the points liability the business owes customers (US-I2,
 * BR-23). It is the net of all `available` lines (earned credit minus what has
 * been spent), with a heads-up on how much is due to expire soon.
 */
export type LiabilityReportDto = {
  /** Net outstanding credit across all customers, in minor units. */
  totalAvailableCents: number;
  /** Number of available lines counted. */
  availableLineCount: number;
  /** Credit expiring within the next 30 days, in minor units. */
  expiringSoonCents: number;
};
