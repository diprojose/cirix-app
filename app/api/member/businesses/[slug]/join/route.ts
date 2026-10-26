import { z } from "zod";
import { getMemberViewer } from "@/lib/auth/dal";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import { makeRegisterCustomer } from "@/modules/crm/infrastructure/di/crm-core-container";
import { statusForTenancyError } from "@/lib/auth/business-access-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

// The client may only choose between these two origins of the signup; every
// identity field (user, email, business) comes from the server.
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
  source: z.enum(["table_qr", "web"]).default("web"),
});

const reply = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * POST /api/member/businesses/<slug>/join — registers the signed-in person as a
 * customer of the business behind the slug. Idempotent: joining twice returns
 * the existing customer (200) instead of creating another (201).
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  }

  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null || viewer.email === null) {
    return reply({ ok: false, error: { code: "iam/access-denied" } }, 401);
  }

  const { slug } = await context.params;
  const business = await makeGetBusinessBySlug().execute(slug);
  if (!business.ok) {
    return reply({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code));
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return reply({ ok: false, error: { code: "request/too-large" } }, 413);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return reply({ ok: false, error: { code: "request/invalid-json" } }, 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return reply({ ok: false, error: { code: "crm/invalid-customer", message: "Review your name and phone." } }, 400);
  }

  const result = await makeRegisterCustomer().execute({
    businessId: business.value.id,
    userId: viewer.uid,
    email: viewer.email,
    name: parsed.data.name,
    phone: parsed.data.phone,
    source: parsed.data.source,
  });
  if (!result.ok) {
    return reply({ ok: false, error: { code: result.error.code, message: result.error.message } }, 400);
  }

  return reply(
    {
      ok: true,
      created: result.value.created,
      business: { slug: business.value.slug, name: business.value.name },
    },
    result.value.created ? 201 : 200
  );
}
