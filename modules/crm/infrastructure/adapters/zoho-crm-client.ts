import "server-only";

export type ZohoCrmRecord = Record<string, unknown> & {
  id?: string;
};

type ListModuleOptions = {
  fields?: string[];
  query?: Record<string, string | number | boolean | null | undefined>;
  maxPages?: number;
  perPage?: number;
};

export class ZohoCrmClient {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async listModule(moduleName: string, options: ListModuleOptions = {}): Promise<ZohoCrmRecord[]> {
    const records: ZohoCrmRecord[] = [];
    const maxPages = options.maxPages ?? 10;
    const perPage = options.perPage ?? 200;

    for (let page = 1; page <= maxPages; page += 1) {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("per_page", String(perPage));

      if (options.fields && options.fields.length > 0) {
        query.set("fields", options.fields.join(","));
      }

      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== null && value !== undefined && value !== "") {
          query.set(key, String(value));
        }
      }

      const response = await this.request(`/${moduleName}?${query.toString()}`, { method: "GET" });
      if (response.status === 204) {
        break;
      }

      const json = (await response.json()) as { data?: ZohoCrmRecord[]; info?: { more_records?: boolean } };
      const data = json.data ?? [];
      records.push(...data);

      if (!json.info?.more_records || data.length < perPage) {
        break;
      }
    }

    return records;
  }

  async searchFirstRecord(moduleName: string, criteria: string, fields?: string[]): Promise<ZohoCrmRecord | null> {
    const query = new URLSearchParams({ criteria });
    if (fields && fields.length > 0) {
      query.set("fields", fields.join(","));
    }

    const response = await this.request(`/${moduleName}/search?${query.toString()}`, { method: "GET" });
    if (response.status === 204) {
      return null;
    }

    const json = (await response.json()) as { data?: ZohoCrmRecord[]; code?: string };
    if (json.code === "NO_CONTENT") {
      return null;
    }

    return json.data?.[0] ?? null;
  }

  async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    const response = await fetch(`${requireEnv("ZOHO_CRM_API_DOMAIN")}/crm/v8${path}`, {
      ...init,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}".`);
  }
  return value;
}

export function escapeCriteriaValue(value: string): string {
  return value.replace(/[()\\]/g, "\\$&");
}
