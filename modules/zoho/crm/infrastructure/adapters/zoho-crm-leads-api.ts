import "server-only";
import type {
  ZohoLeadsGateway,
  ZohoLeadUpsertInput,
  ZohoLeadUpsertResult,
} from "../../domain/repositories/zoho-leads-gateway";
import { toZohoPayload } from "../../application/use-cases/capture-commercial-lead";
import { escapeCriteriaValue, ZohoCrmClient } from "./zoho-crm-client";

export class ZohoCrmLeadsApi implements ZohoLeadsGateway {
  constructor(private readonly client: ZohoCrmClient) {}

  async upsertLead(input: ZohoLeadUpsertInput): Promise<ZohoLeadUpsertResult> {
    const existingZohoLeadId =
      input.existingZohoLeadId ?? (await this.findExistingLeadId(input.lead.email, input.lead.phone));
    const payload = toZohoPayload(input.lead);

    if (existingZohoLeadId) {
      const response = await this.client.request(`/Leads/${existingZohoLeadId}`, {
        method: "PUT",
        body: JSON.stringify({ data: [{ id: existingZohoLeadId, ...payload }] }),
      });
      const json = (await response.json()) as { data?: Array<{ status?: string }> };
      if (json.data?.[0]?.status !== "success") {
        throw new Error("Zoho CRM did not confirm the lead update.");
      }
      return { zohoLeadId: existingZohoLeadId, payload };
    }

    const response = await this.client.request("/Leads/upsert", {
      method: "POST",
      body: JSON.stringify({
        duplicate_check_fields: ["Email", "Phone"],
        data: [payload],
      }),
    });
    const json = (await response.json()) as { data?: Array<{ details?: { id?: string } }> };
    const zohoLeadId = json.data?.[0]?.details?.id;
    if (!zohoLeadId) {
      throw new Error("Zoho CRM did not return a lead id.");
    }
    return { zohoLeadId, payload };
  }

  private async findExistingLeadId(email: string | null, phone: string): Promise<string | null> {
    if (email) {
      const byEmail = await this.searchLead(`(Email:equals:${escapeCriteriaValue(email)})`);
      if (byEmail) {
        return byEmail;
      }
    }

    if (!phone) return null;
    const byPhone = await this.searchLead(`(Phone:equals:${escapeCriteriaValue(phone)})`);
    return byPhone;
  }

  private async searchLead(criteria: string): Promise<string | null> {
    const record = await this.client.searchFirstRecord("Leads", criteria, ["id"]);
    return typeof record?.id === "string" ? record.id : null;
  }
}
