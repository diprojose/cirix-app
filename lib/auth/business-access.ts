import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { localizeForCurrentRequest } from "@/lib/i18n";
import { makeResolveBusinessAccess } from "@/core/tenancy/infrastructure/di/tenancy-container";
import type { BusinessAccessDto } from "@/core/tenancy/application/dtos/business-dto";
import { roleCan, type BusinessPermission } from "@/core/tenancy/domain/value-objects/member-role";
import type { ViewerDto } from "@/core/iam/application/dtos/viewer-dto";
import { getMemberViewer } from "./dal";
import { statusForTenancyError } from "./business-access-status";

/*
 * Authorization for business data. The member session proves who the person is;
 * these helpers decide what they may see in ONE business. The user id comes from
 * the verified session and the business from the URL slug, both resolved on the
 * server: a request can never name another business's id to reach its data.
 * Cirix administrators (the `operator` claim) reach every business for support.
 */

export type BusinessAccess = { viewer: ViewerDto; access: BusinessAccessDto };

/**
 * Resolves the viewer's role in a business once per request: the /biz layout
 * and its page both ask, and each answer costs Firestore round trips. The
 * permission is checked by the callers, so one cached answer serves them all.
 */
const resolveAccess = cache((slug: string, userId: string, platformAdmin: boolean) =>
  makeResolveBusinessAccess().execute({ slug, userId, platformAdmin })
);

/** The cached role, failing with access denied when it lacks the permission. */
async function resolveWithPermission(slug: string, viewer: ViewerDto & { uid: string }, permission?: BusinessPermission) {
  const result = await resolveAccess(slug, viewer.uid, viewer.tier === "operator");
  if (result.ok && permission && !roleCan(result.value.role, permission)) {
    return { ok: false as const, error: { code: "tenancy/access-denied" } };
  }
  return result;
}

/** Pages: guests go to login, everyone else without access sees a plain 404. */
export async function requireBusinessAccess(
  slug: string,
  permission?: BusinessPermission
): Promise<BusinessAccess> {
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    const pathname = (await headers()).get("x-mixmag-pathname") ?? `/biz/${slug}`;
    redirect(await localizeForCurrentRequest(`/login?from=${encodeURIComponent(pathname)}`));
  }
  const result = await resolveWithPermission(slug, { ...viewer, uid: viewer.uid }, permission);
  // Not found, denied and suspended look the same to the person asking.
  if (!result.ok) notFound();
  return { viewer, access: result.value };
}

/** API handlers: a typed outcome with the right HTTP status and no-store caching. */
export async function checkBusinessApiAccess(
  slug: string,
  permission?: BusinessPermission
): Promise<({ ok: true } & BusinessAccess) | { ok: false; response: Response }> {
  const viewer = await getMemberViewer();
  if (!viewer.authenticated || viewer.uid === null) {
    return { ok: false, response: deny(401, "iam/access-denied") };
  }
  const result = await resolveWithPermission(slug, { ...viewer, uid: viewer.uid }, permission);
  if (!result.ok) {
    return { ok: false, response: deny(statusForTenancyError(result.error.code), result.error.code) };
  }
  return { ok: true, viewer, access: result.value };
}

function deny(status: number, code: string): Response {
  return Response.json({ ok: false, error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
}
