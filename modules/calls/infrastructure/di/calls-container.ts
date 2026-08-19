import "server-only";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { CallTrackingService } from "../../application/call-tracking-service";
import { readCallTrackingRuntimeConfig, readTwilioServerConfig } from "../config/call-tracking-config";
import {
  FirestoreBusinessPhoneNumberRepository,
  FirestoreCallRepository,
} from "../persistence/firestore-call-repository";
import { TwilioProvider } from "../providers/twilio-provider";

export function makeCallTrackingDependencies() {
  const config = readTwilioServerConfig();
  const firestore = adminFirestore();
  const calls = new FirestoreCallRepository(firestore);
  const businessPhones = new FirestoreBusinessPhoneNumberRepository(firestore);
  return {
    config,
    calls,
    businessPhones,
    provider: new TwilioProvider(config.authToken),
    service: new CallTrackingService(calls, businessPhones, config),
  };
}

export function makeCallTrackingService() {
  const config = readCallTrackingRuntimeConfig();
  const firestore = adminFirestore();
  const calls = new FirestoreCallRepository(firestore);
  const businessPhones = new FirestoreBusinessPhoneNumberRepository(firestore);
  return { config, service: new CallTrackingService(calls, businessPhones, config) };
}
