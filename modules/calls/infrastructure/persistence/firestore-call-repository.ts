import type { Firestore } from "firebase-admin/firestore";
import { callStatusRank, TERMINAL_CALL_STATUSES, type BusinessPhoneNumber, type TrackedCall } from "../../domain/call";
import type {
  BusinessPhoneNumberRepository,
  CallRepository,
  CallStatusUpdate,
  IncomingCallRecord,
} from "../../domain/call-repository";

export const CALLS_COLLECTION = "calls";
export const BUSINESS_PHONE_NUMBERS_COLLECTION = "business_phone_numbers";

type CallDocument = Omit<TrackedCall, "id">;
type BusinessPhoneDocument = Omit<BusinessPhoneNumber, "id">;

export class FirestoreCallRepository implements CallRepository {
  constructor(private readonly firestore: Firestore) {}

  async upsertIncoming(input: IncomingCallRecord, now: string): Promise<TrackedCall> {
    const id = callDocumentId(input.provider, input.providerCallId);
    const ref = this.firestore.collection(CALLS_COLLECTION).doc(id);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) return restoreCall(id, snapshot.data() as CallDocument);
      const document: CallDocument = { ...input, createdAt: now, updatedAt: now };
      transaction.create(ref, document);
      return restoreCall(id, document);
    });
  }

  async applyStatusUpdate(input: CallStatusUpdate): Promise<TrackedCall | null> {
    const providerId = input.parentCallId ?? input.callId;
    const id = callDocumentId(input.provider, providerId);
    const ref = this.firestore.collection(CALLS_COLLECTION).doc(id);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const current = restoreCall(id, snapshot.data() as CallDocument);
      const next = applyCallStatusUpdate(current, input);
      if (next === current) return current;
      transaction.set(ref, toCallDocument(next));
      return next;
    });
  }

  async findById(id: string): Promise<TrackedCall | null> {
    const snapshot = await this.firestore.collection(CALLS_COLLECTION).doc(id).get();
    return snapshot.exists ? restoreCall(snapshot.id, snapshot.data() as CallDocument) : null;
  }

  async findByProviderCallId(provider: "twilio", callId: string): Promise<TrackedCall | null> {
    return this.findById(callDocumentId(provider, callId));
  }

  async listByBusiness(businessId: string): Promise<TrackedCall[]> {
    const snapshot = await this.firestore
      .collection(CALLS_COLLECTION)
      .where("businessId", "==", businessId)
      .limit(10_000)
      .get();
    return snapshot.docs
      .map((doc) => restoreCall(doc.id, doc.data() as CallDocument))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }
}

export class FirestoreBusinessPhoneNumberRepository implements BusinessPhoneNumberRepository {
  constructor(private readonly firestore: Firestore) {}

  async findActive(provider: "twilio", trackingPhone: string): Promise<BusinessPhoneNumber | null> {
    const id = businessPhoneDocumentId(provider, trackingPhone);
    const snapshot = await this.firestore.collection(BUSINESS_PHONE_NUMBERS_COLLECTION).doc(id).get();
    if (!snapshot.exists) return null;
    const phone = { id, ...(snapshot.data() as BusinessPhoneDocument) };
    return phone.active ? phone : null;
  }
}

export function callDocumentId(provider: string, callId: string): string {
  return `${provider}:${callId}`;
}

export function businessPhoneDocumentId(provider: string, trackingPhone: string): string {
  return `${provider}:${trackingPhone}`;
}

function restoreCall(id: string, document: CallDocument): TrackedCall {
  return { id, ...document };
}

export function applyCallStatusUpdate(current: TrackedCall, input: CallStatusUpdate): TrackedCall {
  if (
    input.sequenceNumber !== null &&
    current.lastSequenceNumber !== null &&
    input.sequenceNumber <= current.lastSequenceNumber
  ) return current;

  const nextSequence = input.sequenceNumber ?? current.lastSequenceNumber;
  const currentIsTerminal = TERMINAL_CALL_STATUSES.has(current.status);
  const wouldDegrade = callStatusRank(input.status) < callStatusRank(current.status);
  if (currentIsTerminal || wouldDegrade) {
    if (nextSequence === current.lastSequenceNumber) return current;
    return { ...current, lastSequenceNumber: nextSequence, updatedAt: input.occurredAt };
  }

  const terminal = TERMINAL_CALL_STATUSES.has(input.status);
  const answeredAt = current.answeredAt ?? (input.status === "answered" ? input.occurredAt : null);
  const endedAt = current.endedAt ?? (terminal ? input.occurredAt : null);
  const fallbackDuration =
    terminal && answeredAt && endedAt
      ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(answeredAt)) / 1000))
      : null;

  return {
    ...current,
    providerChildCallId:
      input.parentCallId && input.callId !== current.providerCallId
        ? input.callId
        : current.providerChildCallId,
    status: input.status,
    ringingAt: current.ringingAt ?? (input.status === "ringing" ? input.occurredAt : null),
    answeredAt,
    endedAt,
    durationSeconds:
      terminal ? input.durationSeconds ?? current.durationSeconds ?? fallbackDuration : current.durationSeconds,
    lastSequenceNumber: nextSequence,
    updatedAt: input.occurredAt,
  };
}

function toCallDocument(call: TrackedCall): CallDocument {
  const document = { ...call } as Partial<TrackedCall>;
  delete document.id;
  return document as CallDocument;
}
