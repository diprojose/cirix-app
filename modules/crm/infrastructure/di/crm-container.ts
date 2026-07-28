import "server-only";
import type { CrmReadModel } from "../../domain/repositories/crm-read-model";
import { GetCrmDashboard } from "../../application/use-cases/get-crm-dashboard";
import { CaptureCommercialLead } from "../../application/use-cases/capture-commercial-lead";
import { MockZohoCrmReadModel } from "../adapters/mock-zoho-crm-read-model";
import { ZohoCrmLeadsApi } from "../adapters/zoho-crm-leads-api";
import { FirestoreCommercialLeadSyncRepository } from "../persistence/firestore-commercial-lead-sync-repository";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";

let crmReadModel: CrmReadModel | null = null;
let captureCommercialLead: CaptureCommercialLead | null = null;

function readModel(): CrmReadModel {
  crmReadModel ??= new MockZohoCrmReadModel();
  return crmReadModel;
}

export const makeGetCrmDashboard = (): GetCrmDashboard => new GetCrmDashboard(readModel());

export const makeCaptureCommercialLead = (): CaptureCommercialLead => {
  captureCommercialLead ??= new CaptureCommercialLead(
    new FirestoreCommercialLeadSyncRepository(adminFirestore()),
    new ZohoCrmLeadsApi()
  );
  return captureCommercialLead;
};
