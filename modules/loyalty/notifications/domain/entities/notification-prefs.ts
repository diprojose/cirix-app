import type { NotificationChannel } from "../value-objects/notification-channel";

/** Props backing {@link NotificationPrefs} (keyed by customer uid). */
type NotificationPrefsProps = {
  customerUid: string;
  inApp: boolean;
  push: boolean;
  email: boolean;
  /** When the customer last consented to an external channel (push/email). */
  consentedAt: string | null;
};

/** Input accepted by {@link NotificationPrefs.restore}. */
export type RestoreNotificationPrefsInput = NotificationPrefsProps;

/**
 * NotificationPrefs captures a customer's per-channel notification choices and
 * their consent to the external channels (BR-22). The dispatcher honors these,
 * so a customer is never notified on a channel they turned off. In-app is on by
 * default; push and email are opt-in and stamp a consent time when first enabled.
 */
export class NotificationPrefs {
  private constructor(private readonly props: NotificationPrefsProps) {}

  /** The default prefs for a customer who has never set any: in-app only. */
  static createDefault(customerUid: string): NotificationPrefs {
    return new NotificationPrefs({
      customerUid,
      inApp: true,
      push: false,
      email: false,
      consentedAt: null,
    });
  }

  /** Rebuilds prefs from a persisted snapshot. */
  static restore(input: RestoreNotificationPrefsInput): NotificationPrefs {
    return new NotificationPrefs({ ...input });
  }

  /** Applies the customer's new channel choices, stamping consent when needed. */
  update(input: { inApp: boolean; push: boolean; email: boolean }): NotificationPrefs {
    const consentedAt =
      (input.push || input.email) && this.props.consentedAt === null
        ? new Date().toISOString()
        : this.props.consentedAt;
    return new NotificationPrefs({
      customerUid: this.props.customerUid,
      inApp: input.inApp,
      push: input.push,
      email: input.email,
      consentedAt,
    });
  }

  /** Whether the customer accepts notifications on the given channel. */
  allows(channel: NotificationChannel): boolean {
    switch (channel) {
      case "in_app":
        return this.props.inApp;
      case "push":
        return this.props.push;
      case "email":
        return this.props.email;
    }
  }

  get customerUid(): string {
    return this.props.customerUid;
  }

  get inApp(): boolean {
    return this.props.inApp;
  }

  get push(): boolean {
    return this.props.push;
  }

  get email(): boolean {
    return this.props.email;
  }

  get consentedAt(): string | null {
    return this.props.consentedAt;
  }
}
