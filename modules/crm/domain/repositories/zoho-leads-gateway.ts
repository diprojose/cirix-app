import type { NormalizedCommercialLeadInput } from "../../application/dtos/commercial-lead-dto";

export type ZohoLeadUpsertInput = {
  existingZohoLeadId?: string | null;
  lead: NormalizedCommercialLeadInput;
};

export type ZohoLeadUpsertResult = {
  zohoLeadId: string;
  payload: Record<string, unknown>;
};

export interface ZohoLeadsGateway {
  upsertLead(input: ZohoLeadUpsertInput): Promise<ZohoLeadUpsertResult>;
}
