export const CALL_STATUSES = [
  "initiated",
  "ringing",
  "answered",
  "completed",
  "no_answer",
  "busy",
  "failed",
  "canceled",
] as const;

export type CallStatus = (typeof CALL_STATUSES)[number];
export type TelephonyProviderName = "twilio";

export type TrackedCall = {
  id: string;
  businessId: string;
  provider: TelephonyProviderName;
  providerAccountId: string;
  providerCallId: string;
  providerChildCallId: string | null;
  callerPhone: string;
  trackingPhone: string;
  destinationPhone: string;
  direction: "inbound";
  status: CallStatus;
  startedAt: string;
  ringingAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  lastSequenceNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessPhoneNumber = {
  id: string;
  businessId: string;
  provider: TelephonyProviderName;
  trackingPhone: string;
  destinationPhone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const TERMINAL_CALL_STATUSES = new Set<CallStatus>([
  "completed",
  "no_answer",
  "busy",
  "failed",
  "canceled",
]);

export function mapTwilioStatus(status: string): CallStatus | null {
  switch (status.toLowerCase()) {
    case "queued":
    case "initiated":
      return "initiated";
    case "ringing":
      return "ringing";
    case "in-progress":
    case "answered":
      return "answered";
    case "completed":
      return "completed";
    case "no-answer":
      return "no_answer";
    case "busy":
      return "busy";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return null;
  }
}

export function callStatusRank(status: CallStatus): number {
  if (status === "initiated") return 0;
  if (status === "ringing") return 1;
  if (status === "answered") return 2;
  return 3;
}

