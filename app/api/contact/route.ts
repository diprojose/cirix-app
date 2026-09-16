import { z } from "zod";
import { CrmLeadSyncFailedError } from "@/modules/zoho/crm/domain/errors/crm-errors";
import { makeCaptureCommercialLead } from "@/modules/zoho/crm/infrastructure/di/crm-container";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).default("").refine(
    (value) => !value || value.replace(/\D/g, "").length >= 7
  ),
  company: z.string().trim().max(150).default(""),
  service_needed: z.string().trim().min(1).max(150),
  message: z.string().trim().min(1).max(2000),
  campaign: z.string().trim().max(200).default(""),
  _honey: z.string().max(200).default(""),
});

function cors(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.CONTACT_ALLOWED_ORIGINS ?? "https://cirixad.com,https://www.cirixad.com")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const headers = new Headers({ "Vary": "Origin", "Cache-Control": "no-store" });
  if (origin && !allowed.includes(origin) && origin !== new URL(request.url).origin) {
    return { allowed: false, headers };
  }
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return { allowed: true, headers };
}

export function OPTIONS(request: Request) {
  const access = cors(request);
  return new Response(null, { status: access.allowed ? 204 : 403, headers: access.headers });
}

export async function POST(request: Request) {
  const access = cors(request);
  const reply = (body: Record<string, unknown>, status: number) =>
    Response.json(body, { status, headers: access.headers });
  if (!access.allowed) return reply({ ok: false, message: "Origin not allowed." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ ok: false, message: "Expected JSON." }, 415);
  }

  let payload: unknown;
  try {
    // Limit the streamed body before parsing, even without Content-Length.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 16384) {
          await reader.cancel();
          return reply({ ok: false, message: "Message is too large." }, 413);
        }
        chunks.push(chunk.value);
      }
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return reply({ ok: false, message: "Invalid JSON payload." }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return reply({ ok: false, message: "Please review the contact fields." }, 400);
  if (parsed.data._honey) return reply({ ok: true }, 200);

  try {
    const input = parsed.data;
    const result = await makeCaptureCommercialLead().execute({
      fullName: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      interestCategory: input.service_needed,
      message: input.message,
      campaign: input.campaign,
      source: "CirixAd.com contact form",
      locale: "en",
    });
    if (!result.ok) {
      if (result.error instanceof CrmLeadSyncFailedError) {
        // The use case already persisted the inquiry and its failed sync status.
        // Acknowledge receipt so the visitor does not submit duplicates.
        return reply({ ok: true, syncStatus: "failed", trackingEventId: result.error.leadId }, 202);
      }
      return reply({ ok: false, message: "Please review the contact fields." }, 400);
    }
    // Reuse the persisted inquiry UUID so repeated conversion events deduplicate.
    return reply({ ok: true, syncStatus: result.value.syncStatus, trackingEventId: result.value.id }, 201);
  } catch {
    return reply({ ok: false, message: "We could not send your message. Please try again." }, 503);
  }
}
