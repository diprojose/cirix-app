import "server-only";
import type {
  ZohoLeadsGateway,
  ZohoLeadUpsertInput,
  ZohoLeadUpsertResult,
} from "../../domain/repositories/zoho-leads-gateway";
import { toZohoPayload } from "../../application/use-cases/capture-commercial-lead";

export class ZohoCrmLeadsApi implements ZohoLeadsGateway {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async upsertLead(input: ZohoLeadUpsertInput): Promise<ZohoLeadUpsertResult> {
    const existingZohoLeadId =
      input.existingZohoLeadId ?? (await this.findExistingLeadId(input.lead.email, input.lead.phone));
    const payload = toZohoPayload(input.lead);

    if (existingZohoLeadId) {
      await this.request(`/Leads/${existingZohoLeadId}`, {
        method: "PUT",
        body: JSON.stringify({ data: [{ id: existingZohoLeadId, ...payload }] }),
      });
      return { zohoLeadId: existingZohoLeadId, payload };
    }

    const response = await this.request("/Leads/upsert", {
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

    const byPhone = await this.searchLead(`(Phone:equals:${escapeCriteriaValue(phone)})`);
    return byPhone;
  }

  private async searchLead(criteria: string): Promise<string | null> {
    const response = await this.request(`/Leads/search?criteria=${encodeURIComponent(criteria)}`, {
      method: "GET",
    });

    if (response.status === 204) {
      return null;
    }

    const json = (await response.json()) as { data?: Array<{ id?: string }>; code?: string };
    if (json.code === "NO_CONTENT") {
      return null;
    }
    return json.data?.[0]?.id ?? null;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    const response = await fetch(`${requireEnv("ZOHO_CRM_API_DOMAIN")}/crm/v8${path}`, {
      ...init,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.ok) {
      return response;
    }

    const body = await response.text();
    throw new Error(`Zoho CRM request failed (${response.status}): ${body}`);
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    const response = await fetch(`${requireEnv("ZOHO_ACCOUNTS_DOMAIN")}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: requireEnv("ZOHO_REFRESH_TOKEN"),
        client_id: requireEnv("ZOHO_CLIENT_ID"),
        client_secret: requireEnv("ZOHO_CLIENT_SECRET"),
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Zoho token refresh failed (${response.status}).`);
    }

    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      throw new Error("Zoho token refresh did not return an access token.");
    }

    this.accessToken = json.access_token;
    this.accessTokenExpiresAt = Date.now() + Math.max((json.expires_in ?? 3600) - 60, 60) * 1000;
    return json.access_token;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}".`);
  }
  return value;
}

function escapeCriteriaValue(value: string): string {
  return value.replace(/[()\\]/g, "\\$&");
}
