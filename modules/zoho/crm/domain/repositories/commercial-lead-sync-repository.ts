import type {
  NormalizedCommercialLeadInput,
  StoredCommercialLead,
} from "../../application/dtos/commercial-lead-dto";

export type CreateCommercialLeadRecordInput = {
  normalizedLead: NormalizedCommercialLeadInput;
  phoneDigits: string;
  submittedAt: string;
  zohoPayload: Record<string, unknown>;
};

export interface CommercialLeadSyncRepository {
  findLatestByContact(email: string | null, phoneDigits: string): Promise<StoredCommercialLead | null>;
  createPending(input: CreateCommercialLeadRecordInput): Promise<StoredCommercialLead>;
  markSynced(id: string, zohoLeadId: string, syncedAt: string): Promise<void>;
  markFailed(id: string, message: string): Promise<void>;
}
