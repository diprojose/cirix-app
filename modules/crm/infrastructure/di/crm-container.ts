import "server-only";
import type { CrmReadModel } from "../../domain/repositories/crm-read-model";
import { GetCrmDashboard } from "../../application/use-cases/get-crm-dashboard";
import { CaptureCommercialLead } from "../../application/use-cases/capture-commercial-lead";
import { ZohoCrmLeadsApi } from "../adapters/zoho-crm-leads-api";
import { ZohoCrmReadModel } from "../adapters/zoho-crm-read-model";
import { ZohoCrmClient } from "../adapters/zoho-crm-client";
import { FirestoreCommercialLeadSyncRepository } from "../persistence/firestore-commercial-lead-sync-repository";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";

let captureCommercialLead: CaptureCommercialLead | null = null;
let zohoCrmClient: ZohoCrmClient | null = null;

function readModel(): CrmReadModel {
  return new ZohoCrmReadModel(client());
}

function client(): ZohoCrmClient {
  zohoCrmClient ??= new ZohoCrmClient();
  return zohoCrmClient;
}

export const makeGetCrmDashboard = (): GetCrmDashboard => new GetCrmDashboard(readModel());

export const makeCaptureCommercialLead = (): CaptureCommercialLead => {
  captureCommercialLead ??= new CaptureCommercialLead(
    new FirestoreCommercialLeadSyncRepository(adminFirestore()),
    new ZohoCrmLeadsApi(client())
  );
  return captureCommercialLead;
};
