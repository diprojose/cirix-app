import { ZohoCrmClient, requireEnv } from "@/modules/crm/infrastructure/adapters/zoho-crm-client";

const LEAD_FIELDS = [
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
  "Phone",
  "Mobile",
  "Email",
];

const CONTACT_FIELDS = [
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
  "Phone",
  "Mobile",
  "Email",
];

const DEAL_FIELDS = ["id", "Deal_Name", "Stage", "Amount", "Closing_Date"];

export async function GET() {
  const client = new ZohoCrmClient();
  const diagnostics = {
    checkedAt: new Date().toISOString(),
    env: {
      accountsDomain: requireEnv("ZOHO_ACCOUNTS_DOMAIN"),
      crmApiDomain: requireEnv("ZOHO_CRM_API_DOMAIN"),
      clientIdPrefix: `${requireEnv("ZOHO_CLIENT_ID").slice(0, 8)}...`,
    },
    refresh: null as unknown,
    modules: [] as unknown[],
  };

  try {
    diagnostics.refresh = await client.debugRefreshToken();
  } catch (error) {
    diagnostics.refresh = serializeError(error);
    return Response.json(diagnostics, { status: 500 });
  }

  for (const test of [
    { moduleName: "Leads", fields: LEAD_FIELDS },
    { moduleName: "Contacts", fields: CONTACT_FIELDS },
    { moduleName: "Deals", fields: DEAL_FIELDS },
  ]) {
    try {
      diagnostics.modules.push(await client.debugListModule(test.moduleName, test.fields));
    } catch (error) {
      diagnostics.modules.push({
        moduleName: test.moduleName,
        error: serializeError(error),
      });
    }
  }

  return Response.json(diagnostics, { status: 200 });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
