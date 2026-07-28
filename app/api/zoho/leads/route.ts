import type { CommercialLeadInput } from "@/modules/crm/application/dtos/commercial-lead-dto";
import { makeCaptureCommercialLead } from "@/modules/crm/infrastructure/di/crm-container";

const ERROR_MESSAGES: Record<string, string> = {
  "crm/invalid-commercial-lead": "Review the commercial lead fields and try again.",
  "crm/lead-sync-failed": "The lead was stored locally, but Zoho CRM sync failed.",
};

export async function POST(request: Request) {
  let payload: CommercialLeadInput;

  try {
    payload = (await request.json()) as CommercialLeadInput;
  } catch {
    return Response.json(
      { ok: false, message: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const result = await makeCaptureCommercialLead().execute(payload);
  if (!result.ok) {
    const status = result.error.code === "crm/invalid-commercial-lead" ? 400 : 502;
    return Response.json(
      {
        ok: false,
        message: ERROR_MESSAGES[result.error.code] ?? "Unable to capture commercial lead.",
      },
      { status }
    );
  }

  return Response.json({ ok: true, lead: result.value });
}
