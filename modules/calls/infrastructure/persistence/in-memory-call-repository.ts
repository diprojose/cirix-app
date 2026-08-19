import type { BusinessPhoneNumber, TrackedCall } from "../../domain/call";
import type {
  BusinessPhoneNumberRepository,
  CallRepository,
  CallStatusUpdate,
  IncomingCallRecord,
} from "../../domain/call-repository";
import { callDocumentId } from "./firestore-call-repository";
import { applyCallStatusUpdate } from "./firestore-call-repository";

export class InMemoryCallRepository implements CallRepository {
  private readonly records = new Map<string, TrackedCall>();

  constructor(seed: TrackedCall[] = []) {
    seed.forEach((call) => this.records.set(call.id, structuredClone(call)));
  }

  async upsertIncoming(input: IncomingCallRecord, now: string): Promise<TrackedCall> {
    const id = callDocumentId(input.provider, input.providerCallId);
    const existing = this.records.get(id);
    if (existing) return structuredClone(existing);
    const created = { id, ...input, createdAt: now, updatedAt: now };
    this.records.set(id, created);
    return structuredClone(created);
  }

  async applyStatusUpdate(input: CallStatusUpdate): Promise<TrackedCall | null> {
    const id = callDocumentId(input.provider, input.parentCallId ?? input.callId);
    const current = this.records.get(id);
    if (!current) return null;
    const updated = applyCallStatusUpdate(current, input);
    this.records.set(id, updated);
    return structuredClone(updated);
  }

  async findById(id: string) { return structuredClone(this.records.get(id) ?? null); }
  async findByProviderCallId(provider: "twilio", callId: string) { return this.findById(callDocumentId(provider, callId)); }
  async listByBusiness(businessId: string) {
    return [...this.records.values()]
      .filter((call) => call.businessId === businessId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
      .map((call) => structuredClone(call));
  }
}

export class InMemoryBusinessPhoneNumberRepository implements BusinessPhoneNumberRepository {
  constructor(private readonly phones: BusinessPhoneNumber[] = []) {}
  async findActive(provider: "twilio", trackingPhone: string) {
    return this.phones.find((phone) => phone.provider === provider && phone.trackingPhone === trackingPhone && phone.active) ?? null;
  }
}
