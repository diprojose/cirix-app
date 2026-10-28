/**
 * One day of a business's stamp activity, counted as stamps and rewards happen.
 * Owners read these totals instead of every individual record, so a month of
 * activity costs about thirty reads however busy the business is.
 */
export type DailyStampActivity = {
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Stamps given by each employee, by user id. */
  staffStamps: Record<string, number>;
  /** Stamps customers gave themselves with the table QR. */
  tableStamps: number;
  /** Rewards handed over by each employee, by user id. */
  redemptions: Record<string, number>;
  /** Table QR stamps per customer, by user id: who leans on the table QR most. */
  tableStampsByCustomer: Record<string, number>;
};

/**
 * StampActivityReader reads the daily totals. They are written by the card
 * repository in the same transaction as each stamp or redemption, so they can
 * never count a change that did not happen.
 */
export interface StampActivityReader {
  /** The days between `fromDay` and `toDay` (inclusive) that had any activity, oldest first. */
  days(businessId: string, fromDay: string, toDay: string): Promise<DailyStampActivity[]>;
}

/** The UTC day an ISO timestamp falls on. */
export const activityDay = (iso: string): string => iso.slice(0, 10);
