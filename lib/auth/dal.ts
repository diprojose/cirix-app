import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { localizeForCurrentRequest } from "@/lib/i18n";
import { makeGetViewer } from "@/modules/iam/infrastructure/di/iam-container";
import {
  guestViewer,
  type ViewerDto,
} from "@/modules/iam/application/dtos/viewer-dto";
import { SESSION_COOKIE_NAME } from "./session-cookie";

/*
 * Data Access Layer for authentication. This is the authoritative, server-side
 * check recommended by Next.js: it reads the session cookie and resolves the
 * current viewer close to where data is consumed. `getViewer` is memoised with
 * React `cache` so the session is verified at most once per render pass, no
 * matter how many components ask for it.
 */

/** Resolves the current viewer (guest, customer or operator) for this request. */
export const getViewer = cache(async (): Promise<ViewerDto> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const result = await makeGetViewer().execute({ sessionCookie });
  return result.ok ? result.value : guestViewer;
});

/**
 * Guard for order flows: requires a viewer allowed to place orders. Redirects
 * guests to the login page. Returns the viewer so callers can use its identity.
 */
export async function requireCustomer(): Promise<ViewerDto> {
  const viewer = await getViewer();
  if (!viewer.permissions.canPlaceOrders) {
    redirect(await localizeForCurrentRequest("/login"));
  }
  return viewer;
}

/**
 * Guard for the admin panel: requires an operator. Guests go to login; any
 * other signed-in viewer is sent back to the storefront. Every `/admin` page
 * and every admin server action must call this — the role check lives on the
 * server, never only in the UI.
 */
export async function requireOperator(): Promise<ViewerDto> {
  const viewer = await getViewer();
  if (!viewer.permissions.canOperateStore) {
    redirect(
      viewer.authenticated
        ? await localizeForCurrentRequest("/loyalty")
        : await localizeForCurrentRequest("/login?from=/admin")
    );
  }
  return viewer;
}
