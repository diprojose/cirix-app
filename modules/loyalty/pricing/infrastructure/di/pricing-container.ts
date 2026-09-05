import {
  adminFirestore,
  hasFirebaseAdminConfig,
} from "@/shared/infrastructure/firebase-admin";
import type { ManualExchangeRateStore } from "../../domain/ports/manual-exchange-rate-store";
import { GetExchangeRate } from "../../application/use-cases/get-exchange-rate";
import { SetManualExchangeRate } from "../../application/use-cases/set-manual-exchange-rate";
import { BcvMonitorExchangeRateProvider } from "../providers/bcv-monitor-exchange-rate-provider";
import { FallbackExchangeRateProvider } from "../config/fallback-exchange-rate";
import { FirestoreManualExchangeRateStore } from "../persistence/firestore-manual-exchange-rate-store";
import { InMemoryManualExchangeRateStore } from "../persistence/in-memory-manual-exchange-rate-store";

/*
 * Composition root for the pricing module. This is the single place that knows
 * about concrete rate providers, chained in priority order: the live
 * api-monitor-bcv adapter, then the operator's manual rate (Firestore), then
 * the static fallback baked into the deploy. Swapping any source means
 * changing only this file.
 */

const liveProvider = new BcvMonitorExchangeRateProvider();
const fallbackProvider = new FallbackExchangeRateProvider();

let manualStore: ManualExchangeRateStore | null = null;

/** The Firestore-backed manual rate store, created lazily so importing the
 * container does not require Firebase credentials at build time. */
function getManualStore(): ManualExchangeRateStore {
  manualStore ??= hasFirebaseAdminConfig()
    ? new FirestoreManualExchangeRateStore(adminFirestore())
    : new InMemoryManualExchangeRateStore();
  return manualStore;
}

/** Builds the "get exchange rate" use case with its provider chain wired. */
export const makeGetExchangeRate = (): GetExchangeRate =>
  new GetExchangeRate([liveProvider, getManualStore(), fallbackProvider]);

/** Builds the "set manual exchange rate" use case (operator action). */
export const makeSetManualExchangeRate = (): SetManualExchangeRate =>
  new SetManualExchangeRate(getManualStore());
