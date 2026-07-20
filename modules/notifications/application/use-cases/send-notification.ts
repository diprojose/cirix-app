import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { NotificationRepository } from "../../domain/repositories/notification-repository";
import type { NotificationPrefsRepository } from "../../domain/repositories/notification-prefs-repository";
import { Notification } from "../../domain/entities/notification";
import { NotificationPrefs } from "../../domain/entities/notification-prefs";
import type { NotificationType } from "../../domain/value-objects/notification-type";

/** Input for {@link SendNotification}: the recipient and the message. */
export type SendNotificationInput = {
  customerUid: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Optional idempotency key so a repeated event notifies at most once. */
  dedupeKey?: string | null;
};

/**
 * Delivers a notification to a customer, honoring their channel preferences
 * (BR-22). It writes the in-app notification when that channel is enabled and is
 * idempotent on the dedupe key, so a job that reruns never duplicates the inbox.
 * Push and email are pref-gated too, but their senders are wired later (VAPID /
 * a provider); until then this delivers the in-app channel only.
 */
export class SendNotification implements UseCase<SendNotificationInput, void> {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly prefs: NotificationPrefsRepository
  ) {}

  async execute(input: SendNotificationInput): Promise<Result<void, DomainError>> {
    const prefs =
      (await this.prefs.findByCustomer(input.customerUid)) ??
      NotificationPrefs.createDefault(input.customerUid);

    if (!prefs.allows("in_app")) {
      return ok(undefined);
    }

    if (input.dedupeKey) {
      const existing = await this.notifications.findByDedupeKey(
        input.customerUid,
        input.dedupeKey
      );
      if (existing !== null) {
        return ok(undefined);
      }
    }

    const notification = Notification.create({
      customerUid: input.customerUid,
      type: input.type,
      title: input.title,
      body: input.body,
      dedupeKey: input.dedupeKey ?? null,
    });
    if (!notification.ok) {
      return notification;
    }

    await this.notifications.save(notification.value);
    return ok(undefined);
  }
}
