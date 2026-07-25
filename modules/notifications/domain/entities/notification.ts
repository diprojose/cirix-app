import { AggregateRoot } from "@/shared/domain/aggregate-root";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { NotificationId } from "../value-objects/notification-id";
import { isNotificationType, type NotificationType } from "../value-objects/notification-type";
import {
  CorruptNotificationSnapshotError,
  InvalidNotificationError,
} from "../errors/notification-errors";

const MAX_TITLE = 120;
const MAX_BODY = 300;

/** Props backing a {@link Notification} aggregate. */
type NotificationProps = {
  customerUid: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Optional idempotency key so the same event notifies at most once. */
  dedupeKey: string | null;
  read: boolean;
  createdAt: string;
};

/** Input accepted by {@link Notification.restore} when rehydrating persistence. */
export type RestoreNotificationInput = {
  id: string;
  customerUid: string;
  type: string;
  title: string;
  body: string;
  dedupeKey: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * Notification is the aggregate root of the notifications context: one message
 * addressed to a customer, shown in their in-app inbox. It is immutable except
 * for its read flag, and may carry a dedupe key so a repeated event (e.g. the
 * same credit line about to expire, seen on two cron runs) notifies only once.
 */
export class Notification extends AggregateRoot<NotificationProps, NotificationId> {
  private constructor(id: NotificationId, props: NotificationProps) {
    super(id, props);
  }

  /** Creates a fresh, unread notification. Fails with a Result on invalid input. */
  static create(input: {
    customerUid: string;
    type: NotificationType;
    title: string;
    body: string;
    dedupeKey?: string | null;
  }): Result<Notification, DomainError> {
    const customerUid = input.customerUid.trim();
    if (customerUid.length === 0) {
      return err(new InvalidNotificationError("A notification requires a customer uid."));
    }
    const title = input.title.trim();
    if (title.length === 0) {
      return err(new InvalidNotificationError("A notification requires a title."));
    }
    return ok(
      new Notification(NotificationId.generate(), {
        customerUid,
        type: input.type,
        title: title.slice(0, MAX_TITLE),
        body: input.body.trim().slice(0, MAX_BODY),
        dedupeKey: input.dedupeKey ?? null,
        read: false,
        createdAt: new Date().toISOString(),
      })
    );
  }

  /** Rebuilds a notification from a persisted snapshot, revalidating its type. */
  static restore(input: RestoreNotificationInput): Result<Notification, DomainError> {
    if (!isNotificationType(input.type)) {
      return err(new CorruptNotificationSnapshotError(`Unknown notification type "${input.type}".`));
    }
    return ok(
      new Notification(NotificationId.from(input.id), {
        customerUid: input.customerUid,
        type: input.type,
        title: input.title,
        body: input.body,
        dedupeKey: input.dedupeKey,
        read: input.read,
        createdAt: input.createdAt,
      })
    );
  }

  /** Returns a read copy of this notification. */
  markRead(): Notification {
    if (this.props.read) {
      return this;
    }
    return new Notification(this._id, { ...this.props, read: true });
  }

  get customerUid(): string {
    return this.props.customerUid;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get body(): string {
    return this.props.body;
  }

  get dedupeKey(): string | null {
    return this.props.dedupeKey;
  }

  get isRead(): boolean {
    return this.props.read;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }
}
