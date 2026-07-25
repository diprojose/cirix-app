import type { Notification } from "../../domain/entities/notification";
import type { NotificationType } from "../../domain/value-objects/notification-type";
import type { NotificationPrefs } from "../../domain/entities/notification-prefs";

/** One notification as plain, serializable data for the inbox. */
export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

/** Maps a Notification aggregate to its serializable DTO. */
export const toNotificationDto = (notification: Notification): NotificationDto => ({
  id: notification.id.value,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  read: notification.isRead,
  createdAt: notification.createdAt,
});

/** A customer's channel preferences as plain data for the settings form. */
export type NotificationPrefsDto = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

/** Maps NotificationPrefs to its serializable DTO. */
export const toNotificationPrefsDto = (prefs: NotificationPrefs): NotificationPrefsDto => ({
  inApp: prefs.inApp,
  push: prefs.push,
  email: prefs.email,
});
