import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { NotificationPrefsRepository } from "../../domain/repositories/notification-prefs-repository";
import { NotificationPrefs } from "../../domain/entities/notification-prefs";
import { toNotificationPrefsDto, type NotificationPrefsDto } from "../dtos/notification-dto";

/** Input for {@link GetNotificationPrefs}: whose preferences to read. */
export type GetNotificationPrefsInput = { customerUid: string };

/**
 * Returns a customer's notification channel preferences, falling back to the
 * defaults (in-app on) when none are stored yet.
 */
export class GetNotificationPrefs
  implements UseCase<GetNotificationPrefsInput, NotificationPrefsDto>
{
  constructor(private readonly prefs: NotificationPrefsRepository) {}

  async execute(
    input: GetNotificationPrefsInput
  ): Promise<Result<NotificationPrefsDto, DomainError>> {
    const prefs =
      (await this.prefs.findByCustomer(input.customerUid)) ??
      NotificationPrefs.createDefault(input.customerUid);
    return ok(toNotificationPrefsDto(prefs));
  }
}
