import { makeGetCrmDashboard } from "@/modules/zoho/crm/infrastructure/di/crm-container";

export async function GET() {
  const result = await makeGetCrmDashboard().execute();
  if (!result.ok) {
    return Response.json({ error: result.error.code }, { status: 503 });
  }

  return Response.json(result.value);
}
