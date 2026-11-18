import "server-only";
import { notFound } from "next/navigation";
import type { ViewerDto } from "@/core/iam/application/dtos/viewer-dto";
import { getViewer, requirePlatformUser } from "./dal";

/*
 * The gate for the screens where Cirix looks after every business (/businesses
 * and /api/admin/businesses). Only Cirix administrators (the `operator` tier)
 * pass. The proxy and the root layout already require an admitted account; this
 * is the check that keeps every other admitted account out.
 */

export type CirixAdmin = ViewerDto & { uid: string };

const isCirixAdmin = (viewer: ViewerDto): viewer is CirixAdmin =>
  viewer.authenticated && viewer.tier === "operator" && typeof viewer.uid === "string" && viewer.uid.length > 0;

/** Pages: guests go to sign in; any other account sees a plain 404, as if the page did not exist. */
export async function requireCirixAdmin(): Promise<CirixAdmin> {
  const viewer = await requirePlatformUser();
  if (!isCirixAdmin(viewer)) notFound();
  return viewer;
}

/** API handlers: the administrator, or the response to send instead. */
export async function checkCirixAdminApi(): Promise<{ ok: true; admin: CirixAdmin } | { ok: false; response: Response }> {
  const viewer = await getViewer();
  if (!viewer.authenticated) return { ok: false, response: deny(401, "iam/access-denied") };
  if (!isCirixAdmin(viewer)) return { ok: false, response: deny(403, "iam/operator-required") };
  return { ok: true, admin: viewer };
}

function deny(status: number, code: string): Response {
  return Response.json({ ok: false, error: { code } }, { status, headers: { "Cache-Control": "no-store" } });
}
