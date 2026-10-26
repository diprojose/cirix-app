import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { localizeForCurrentRequest } from "@/lib/i18n";
import { makeResolveBusinessAccess } from "@/core/tenancy/infrastructure/di/tenancy-container";
import type { BusinessAccessDto } from "@/core/tenancy/application/dtos/business-dto";
import type { BusinessPermission } from "@/core/tenancy/domain/value-objects/member-role";
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
  const result = await makeResolveBusinessAccess().execute({
    slug,
    userId: viewer.uid,
    platformAdmin: viewer.tier === "operator",
    permission,
  });
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
  const result = await makeResolveBusinessAccess().execute({
    slug,
    userId: viewer.uid,
    platformAdmin: viewer.tier === "operator",
    permission,
  });
  if (!result.ok) {
    return { ok: false, response: deny(statusForTenancyError(result.error.code), result.error.code) };
  }
  return { ok: true, viewer, access: result.value };
}

function deny(status: number, code: string): Response {
  return Response.json({ ok: false, error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
}
