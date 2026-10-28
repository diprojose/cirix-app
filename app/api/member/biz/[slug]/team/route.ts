import { z } from "zod";
import { checkBusinessApiAccess } from "@/lib/auth/business-access";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { isSameOrigin, json } from "@/lib/stamps/http";
import type { DomainError } from "@/shared/domain/domain-error";
import { makeAddTeamMember, makeListTeam, makeRemoveTeamMember } from "@/core/tenancy/infrastructure/di/tenancy-container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

const addSchema = z.object({ email: z.string().trim().max(254), role: z.string().max(20) });
const removeSchema = z.object({ userId: z.string().trim().min(1).max(128) });

const teamError = (error: DomainError): Response =>
  json({ ok: false, error: { code: error.code, message: error.message } }, statusForTenancyError(error.code));

/** Reads a small JSON body, or answers why it cannot. */
async function readBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ ok: false, error: { code: "request/too-large" } }, 413) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ ok: false, error: { code: "request/invalid-json" } }, 400) };
  }
}

/** GET /api/member/biz/<slug>/team — who works at the business (owner or Cirix administrator). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const gate = await checkBusinessApiAccess(slug, "members:manage");
  if (!gate.ok) return gate.response;
  const result = await makeListTeam().execute(gate.access.business.id);
  return result.ok ? json({ ok: true, team: result.value }) : teamError(result.error);
}

/**
 * POST /api/member/biz/<slug>/team — gives a person a role by email, or changes
 * it. Owners manage staff only; owners are changed by Cirix administrators.
 */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "members:manage");
  if (!gate.ok) return gate.response;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const parsed = addSchema.safeParse(body.body);
  if (!parsed.success) return json({ ok: false, error: { code: "tenancy/invalid-membership" } }, 400);

  const result = await makeAddTeamMember().execute({
    businessId: gate.access.business.id,
    actorUserId: gate.viewer.uid ?? "",
    actorRole: gate.access.role,
    ...parsed.data,
  });
  return result.ok ? json({ ok: true, member: result.value }) : teamError(result.error);
}

/** DELETE /api/member/biz/<slug>/team — takes a person's role away. */
export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isSameOrigin(request)) return json({ ok: false, error: { code: "iam/invalid-origin" } }, 403);
  const gate = await checkBusinessApiAccess(slug, "members:manage");
  if (!gate.ok) return gate.response;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const parsed = removeSchema.safeParse(body.body);
  if (!parsed.success) return json({ ok: false, error: { code: "tenancy/member-not-found" } }, 404);

  const result = await makeRemoveTeamMember().execute({
    businessId: gate.access.business.id,
    actorUserId: gate.viewer.uid ?? "",
    actorRole: gate.access.role,
    userId: parsed.data.userId,
  });
  return result.ok ? json({ ok: true, userId: result.value.userId }) : teamError(result.error);
}
