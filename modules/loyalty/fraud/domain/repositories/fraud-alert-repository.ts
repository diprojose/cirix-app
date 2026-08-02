import type { FraudAlert } from "../entities/fraud-alert";
import type { FraudAlertId } from "../value-objects/fraud-alert-id";

/**
 * FraudAlertRepository is the persistence port for fraud alerts. `findPending`
 * backs the analyst's review queue; the rest support raising and resolving.
 */
export interface FraudAlertRepository {
  /** Returns the alert with the given id, or `null` when none exists. */
  findById(id: FraudAlertId): Promise<FraudAlert | null>;

  /** The alerts still awaiting review, newest first (bounded by the adapter). */
  findPending(): Promise<FraudAlert[]>;

  /** Inserts the alert or replaces the existing one with the same id. */
  save(alert: FraudAlert): Promise<void>;
}
