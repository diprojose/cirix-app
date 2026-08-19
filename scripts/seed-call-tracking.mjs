import { loadEnvConfig } from "@next/env";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

loadEnvConfig(process.cwd());

if (!process.argv.includes("--confirm")) {
  throw new Error("Refusing to seed without --confirm.");
}
if (process.env.TWILIO_TRIAL_MODE !== "true") {
  throw new Error("Call seed is allowed only when TWILIO_TRIAL_MODE=true.");
}

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
};

const app = getApps().find((candidate) => candidate.name === "call-tracking-seed") ?? initializeApp({
  credential: cert({
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }),
}, "call-tracking-seed");

const firestore = getFirestore(app);
const businessId = process.env.CALL_TRACKING_BUSINESS_ID?.trim() || "default";
const trackingPhone = required("TWILIO_PHONE_NUMBER");
const destinationPhone = required("TWILIO_FORWARD_TO_NUMBER");
const now = new Date();
const callers = Array.from({ length: 15 }, (_, index) => `+58412${String(1000000 + index).padStart(7, "0")}`);
const terminalStatuses = ["no_answer", "busy", "failed", "canceled", "no_answer", "busy"];
const batch = firestore.batch();

for (let index = 0; index < 20; index += 1) {
  const providerCallId = `CASEED${String(index + 1).padStart(4, "0")}`;
  const started = new Date(now.getTime() - index * 3_600_000);
  const answered = index < 14 ? new Date(started.getTime() + 6_000) : null;
  const duration = answered ? 75 + index * 11 : null;
  const ended = new Date((answered ?? started).getTime() + (duration ?? 35) * 1_000);
  const timestamp = started.toISOString();
  batch.set(firestore.collection("calls").doc(`twilio:${providerCallId}`), {
    businessId,
    provider: "twilio",
    providerAccountId: process.env.TWILIO_ACCOUNT_SID?.trim() || "AC_TRIAL_SEED",
    providerCallId,
    providerChildCallId: `CASEEDCHILD${String(index + 1).padStart(4, "0")}`,
    callerPhone: callers[index % callers.length],
    trackingPhone,
    destinationPhone,
    direction: "inbound",
    status: answered ? "completed" : terminalStatuses[index - 14],
    startedAt: timestamp,
    ringingAt: new Date(started.getTime() + 1_000).toISOString(),
    answeredAt: answered?.toISOString() ?? null,
    endedAt: ended.toISOString(),
    durationSeconds: duration,
    lastSequenceNumber: 3,
    createdAt: timestamp,
    updatedAt: ended.toISOString(),
  });
}

const phoneId = `twilio:${trackingPhone}`;
batch.set(firestore.collection("business_phone_numbers").doc(phoneId), {
  businessId,
  provider: "twilio",
  trackingPhone,
  destinationPhone,
  active: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
}, { merge: true });

await batch.commit();
console.log("Seeded 20 deterministic call records and one business phone mapping.");
