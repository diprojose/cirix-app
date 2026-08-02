import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { NotificationPrefsRepository } from "../../domain/repositories/notification-prefs-repository";
import { NotificationPrefs } from "../../domain/entities/notification-prefs";
import { toNotificationPrefsDto, type NotificationPrefsDto } from "../dtos/notification-dto";

/** Input for {@link SaveNotificationPrefs}: the customer's new channel choices. */
export type SaveNotificationPrefsInput = {
  customerUid: string;
  inApp: boolean;
  push: boolean;
  email: boolean;
};

/**
 * Saves a customer's notification channel preferences (US-H4, UC-22). Enabling
 * an external channel stamps a consent time (BR-22); the dispatcher then honors
 * these choices on every send.
 */
export class SaveNotificationPrefs
  implements UseCase<SaveNotificationPrefsInput, NotificationPrefsDto>
{
  constructor(private readonly prefs: NotificationPrefsRepository) {}

  async execute(
    input: SaveNotificationPrefsInput
  ): Promise<Result<NotificationPrefsDto, DomainError>> {
    const current =
      (await this.prefs.findByCustomer(input.customerUid)) ??
      NotificationPrefs.createDefault(input.customerUid);
    const updated = current.update({
      inApp: input.inApp,
      push: input.push,
      email: input.email,
    });
    await this.prefs.save(updated);
    return ok(toNotificationPrefsDto(updated));
  }
}
