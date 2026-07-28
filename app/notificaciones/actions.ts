"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/dal";
import { localizeForCurrentRequest } from "@/lib/i18n";
import {
  makeSaveNotificationPrefs,
  makeMarkNotificationsRead,
} from "@/modules/notifications/infrastructure/di/notifications-container";

/*
 * Customer-facing notification actions. Each re-checks `requireCustomer` on the
 * server and is scoped strictly to the signed-in viewer's own uid.
 */

/** Saves the customer's notification channel preferences (US-H4). */
export async function saveNotificationPrefsAction(formData: FormData): Promise<void> {
  const viewer = await requireCustomer();
  if (!viewer.uid) {
    redirect(await localizeForCurrentRequest("/login"));
  }

  await makeSaveNotificationPrefs().execute({
    customerUid: viewer.uid,
    inApp: formData.get("inApp") === "on",
    push: formData.get("push") === "on",
    email: formData.get("email") === "on",
  });

  revalidatePath("/notificaciones");
  redirect(await localizeForCurrentRequest("/notificaciones?saved=1"));
}

/** Marks all of the customer's notifications read. */
export async function markNotificationsReadAction(): Promise<void> {
  const viewer = await requireCustomer();
  if (!viewer.uid) {
    redirect(await localizeForCurrentRequest("/login"));
  }

  await makeMarkNotificationsRead().execute({ customerUid: viewer.uid });
  revalidatePath("/notificaciones");
}
