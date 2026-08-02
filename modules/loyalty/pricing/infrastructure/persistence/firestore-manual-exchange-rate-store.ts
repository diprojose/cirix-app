import type { Firestore } from "firebase-admin/firestore";
import { ExchangeRate } from "../../domain/value-objects/exchange-rate";
import type { ManualExchangeRateStore } from "../../domain/ports/manual-exchange-rate-store";

/** Single settings document holding the operator's manual rate. */
const DOC_PATH = "settings/exchange-rate";

/** The Firestore shape of the manual rate. */
type ManualRateDocument = {
  vesPerUsd: number;
  asOf: string;
  updatedAt: string;
};

/**
 * FirestoreManualExchangeRateStore is the production adapter for the
 * {@link ManualExchangeRateStore} port: one settings document the admin panel
 * writes and the rate provider chain reads when the live BCV feed is down.
 * A missing or invalid document simply yields `null` — the chain moves on to
 * the static fallback.
 */
export class FirestoreManualExchangeRateStore implements ManualExchangeRateStore {
  constructor(private readonly firestore: Firestore) {}

  async getUsdRate(): Promise<ExchangeRate | null> {
    const snapshot = await this.firestore.doc(DOC_PATH).get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as ManualRateDocument;
    const result = ExchangeRate.create(data.vesPerUsd, "manual", data.asOf);
    return result.ok ? result.value : null;
  }

  async save(rate: ExchangeRate): Promise<void> {
    const document: ManualRateDocument = {
      vesPerUsd: rate.vesPerUsd,
      asOf: rate.asOf,
      updatedAt: new Date().toISOString(),
    };
    await this.firestore.doc(DOC_PATH).set(document);
  }
}
