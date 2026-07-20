import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { NotificationRepository } from "../../domain/repositories/notification-repository";
import type { NotificationPrefsRepository } from "../../domain/repositories/notification-prefs-repository";
import { FirestoreNotificationRepository } from "../persistence/firestore-notification-repository";
import { FirestoreNotificationPrefsRepository } from "../persistence/firestore-notification-prefs-repository";
import { SendNotification } from "../../application/use-cases/send-notification";
import { ListNotifications } from "../../application/use-cases/list-notifications";
import { MarkNotificationsRead } from "../../application/use-cases/mark-notifications-read";
import { GetNotificationPrefs } from "../../application/use-cases/get-notification-prefs";
import { SaveNotificationPrefs } from "../../application/use-cases/save-notification-prefs";

/*
 * Composition root for the notifications module. The single place that knows the
 * concrete adapters: Firestore for notifications and channel preferences.
 * Adapters are created lazily so importing the container needs no Firebase
 * credentials at build time. Server-only.
 */

let notificationRepository: NotificationRepository | null = null;
let prefsRepository: NotificationPrefsRepository | null = null;

function notifications(): NotificationRepository {
  notificationRepository ??= new FirestoreNotificationRepository(adminFirestore());
  return notificationRepository;
}

function prefs(): NotificationPrefsRepository {
  prefsRepository ??= new FirestoreNotificationPrefsRepository(adminFirestore());
  return prefsRepository;
}

/** Builds the "send notification" use case (event dispatch, pref-aware). */
export const makeSendNotification = (): SendNotification =>
  new SendNotification(notifications(), prefs());

/** Builds the "list notifications" use case (customer inbox). */
export const makeListNotifications = (): ListNotifications =>
  new ListNotifications(notifications());

/** Builds the "mark notifications read" use case (open inbox). */
export const makeMarkNotificationsRead = (): MarkNotificationsRead =>
  new MarkNotificationsRead(notifications());

/** Builds the "get notification prefs" use case (settings read). */
export const makeGetNotificationPrefs = (): GetNotificationPrefs =>
  new GetNotificationPrefs(prefs());

/** Builds the "save notification prefs" use case (settings write). */
export const makeSaveNotificationPrefs = (): SaveNotificationPrefs =>
  new SaveNotificationPrefs(prefs());
