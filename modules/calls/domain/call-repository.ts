import type { BusinessPhoneNumber, CallStatus, TrackedCall } from "./call";

export type IncomingCallRecord = Omit<TrackedCall, "id" | "createdAt" | "updatedAt">;

export type CallStatusUpdate = {
  provider: "twilio";
  parentCallId: string | null;
  callId: string;
  status: CallStatus;
  sequenceNumber: number | null;
  durationSeconds: number | null;
  occurredAt: string;
};

export interface CallRepository {
  upsertIncoming(input: IncomingCallRecord, now: string): Promise<TrackedCall>;
  applyStatusUpdate(input: CallStatusUpdate): Promise<TrackedCall | null>;
  findById(id: string): Promise<TrackedCall | null>;
  findByProviderCallId(provider: "twilio", callId: string): Promise<TrackedCall | null>;
  listByBusiness(businessId: string): Promise<TrackedCall[]>;
}

export interface BusinessPhoneNumberRepository {
  findActive(provider: "twilio", trackingPhone: string): Promise<BusinessPhoneNumber | null>;
}

