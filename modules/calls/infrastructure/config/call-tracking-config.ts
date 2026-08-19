import "server-only";
import type { CallTrackingRuntimeConfig } from "../../application/call-tracking-service";

export type TwilioServerConfig = CallTrackingRuntimeConfig & {
  authToken: string;
  webhookBaseUrl: string | null;
};

export function readCallTrackingRuntimeConfig(): CallTrackingRuntimeConfig {
  return {
    businessId: process.env.CALL_TRACKING_BUSINESS_ID?.trim() || "default",
    accountSid: optionalEnv("TWILIO_ACCOUNT_SID") ?? "",
    trackingPhone: optionalEnv("TWILIO_PHONE_NUMBER"),
    fallbackDestinationPhone: optionalEnv("TWILIO_FORWARD_TO_NUMBER"),
    timeZone: optionalEnv("CALL_TRACKING_TIME_ZONE") ?? "America/Caracas",
    trialMode: process.env.TWILIO_TRIAL_MODE === "true",
  };
}

export function readTwilioServerConfig(): TwilioServerConfig {
  const runtime = readCallTrackingRuntimeConfig();
  return {
    ...runtime,
    accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
    authToken: requireEnv("TWILIO_AUTH_TOKEN"),
    webhookBaseUrl: optionalEnv("TWILIO_WEBHOOK_BASE_URL")?.replace(/\/$/, "") ?? null,
  };
}

function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) throw new Error(`Missing required environment variable "${name}".`);
  return value;
}

function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}
