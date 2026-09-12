import { checkApiAccess } from "@/lib/auth/api-access";
import { makeGetCrmDashboard } from "@/modules/zoho/crm/infrastructure/di/crm-container";

export async function GET() {
  const accessDenied = await checkApiAccess();
  if (accessDenied) return accessDenied;

  const result = await makeGetCrmDashboard().execute();
  if (!result.ok) {
    return Response.json({ error: result.error.code }, { status: 503 });
  }

  return Response.json(result.value);
}
