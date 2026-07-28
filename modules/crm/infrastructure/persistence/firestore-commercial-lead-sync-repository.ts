import type { Firestore } from "firebase-admin/firestore";
import type {
  CreateCommercialLeadRecordInput,
  CommercialLeadSyncRepository,
} from "../../domain/repositories/commercial-lead-sync-repository";
import type { StoredCommercialLead } from "../../application/dtos/commercial-lead-dto";

const COLLECTION = "crm_web_leads";

type CommercialLeadDocument = Omit<StoredCommercialLead, "id">;

export class FirestoreCommercialLeadSyncRepository
  implements CommercialLeadSyncRepository
{
  constructor(private readonly firestore: Firestore) {}

  async findLatestByContact(
    email: string | null,
    phoneDigits: string
  ): Promise<StoredCommercialLead | null> {
    const snapshot = await this.firestore.collection(COLLECTION).limit(50).get();
    const matches = snapshot.docs
      .map((doc) => restore(doc.id, doc.data() as CommercialLeadDocument))
      .filter((lead) => {
        if (email && lead.email && lead.email === email) {
          return true;
        }
        return lead.phoneDigits === phoneDigits;
      })
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

    return matches[0] ?? null;
  }

  async createPending(input: CreateCommercialLeadRecordInput): Promise<StoredCommercialLead> {
    const id = crypto.randomUUID();
    const document: CommercialLeadDocument = {
      fullName: input.normalizedLead.fullName,
      phone: input.normalizedLead.phone,
      phoneDigits: input.phoneDigits,
      email: input.normalizedLead.email,
      message: input.normalizedLead.message,
      source: input.normalizedLead.source,
      campaign: input.normalizedLead.campaign,
      interestCategory: input.normalizedLead.interestCategory,
      locale: input.normalizedLead.locale,
      submittedAt: input.submittedAt,
      syncStatus: "pending",
      syncAttempts: 1,
      zohoLeadId: null,
      zohoPayload: input.zohoPayload,
      lastError: null,
      syncedAt: null,
    };

    await this.firestore.collection(COLLECTION).doc(id).set(document);
    return restore(id, document);
  }

  async markSynced(id: string, zohoLeadId: string, syncedAt: string): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(id).set(
      {
        syncStatus: "synced",
        zohoLeadId,
        syncedAt,
        lastError: null,
      },
      { merge: true }
    );
  }

  async markFailed(id: string, message: string): Promise<void> {
    await this.firestore.collection(COLLECTION).doc(id).set(
      {
        syncStatus: "failed",
        lastError: message,
      },
      { merge: true }
    );
  }
}

function restore(id: string, document: CommercialLeadDocument): StoredCommercialLead {
  return {
    id,
    fullName: document.fullName,
    phone: document.phone,
    phoneDigits: document.phoneDigits,
    email: document.email,
    message: document.message,
    source: document.source,
    campaign: document.campaign,
    interestCategory: document.interestCategory,
    locale: document.locale,
    submittedAt: document.submittedAt,
    syncStatus: document.syncStatus,
    syncAttempts: document.syncAttempts,
    zohoLeadId: document.zohoLeadId,
    zohoPayload: document.zohoPayload,
    lastError: document.lastError,
    syncedAt: document.syncedAt,
  };
}

