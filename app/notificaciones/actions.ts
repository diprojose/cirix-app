"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { localizeForCurrentRequest } from "@/lib/i18n";
import {
  makeSaveNotificationPrefs,
  makeMarkNotificationsRead,
} from "@/modules/loyalty/notifications/infrastructure/di/notifications-container";

/*
 * Customer-facing notification actions. Each re-checks `requireCustomer` on the
 * server and is scoped strictly to the signed-in viewer's own uid.
 */

const BRANDED_NOTIFICATIONS_PATH =
  /^\/demo\/[a-z0-9]+(?:-[a-z0-9]+)*\/notificaciones$/;

/** Only accepts the two notification destinations rendered by this app. */
function notificationReturnPath(formData: FormData): string {
  const candidate = formData.get("returnTo");
  if (
    candidate === "/notificaciones" ||
    (typeof candidate === "string" && BRANDED_NOTIFICATIONS_PATH.test(candidate))
  ) {
    return candidate;
  }
  return "/notificaciones";
}

async function requireNotificationCustomerUid(returnPath: string): Promise<string> {
  const viewer = await getViewer();
  if (viewer.uid && viewer.permissions.canPlaceOrders) return viewer.uid;

  const localizedReturnTo = await localizeForCurrentRequest(returnPath);
  const brandedRoot = returnPath.match(/^(\/demo\/[^/]+)\/notificaciones$/)?.[1];
  const loginPath = brandedRoot ? `${brandedRoot}/login` : "/login";
  redirect(
    await localizeForCurrentRequest(
      `${loginPath}?from=${encodeURIComponent(localizedReturnTo)}`
    )
  );
}

/** Saves the customer's notification channel preferences (US-H4). */
export async function saveNotificationPrefsAction(formData: FormData): Promise<void> {
  const returnPath = notificationReturnPath(formData);
  const customerUid = await requireNotificationCustomerUid(returnPath);

  await makeSaveNotificationPrefs().execute({
    customerUid,
    inApp: formData.get("inApp") === "on",
    push: formData.get("push") === "on",
    email: formData.get("email") === "on",
  });

  const localizedPath = await localizeForCurrentRequest(returnPath);
  revalidatePath(localizedPath);
  redirect(await localizeForCurrentRequest(`${returnPath}?saved=1`));
}

/** Marks all of the customer's notifications read. */
export async function markNotificationsReadAction(formData: FormData): Promise<void> {
  const returnPath = notificationReturnPath(formData);
  const customerUid = await requireNotificationCustomerUid(returnPath);

  await makeMarkNotificationsRead().execute({ customerUid });
  revalidatePath(await localizeForCurrentRequest(returnPath));
}
