import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { NotificationRepository } from "../../domain/repositories/notification-repository";
import { toNotificationDto, type NotificationDto } from "../dtos/notification-dto";

/** Input for {@link ListNotifications}: whose inbox to read. */
export type ListNotificationsInput = { customerUid: string };

/**
 * Returns a customer's notification inbox, scoped strictly to their own uid so a
 * customer only ever sees their own notifications.
 */
export class ListNotifications implements UseCase<ListNotificationsInput, NotificationDto[]> {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(input: ListNotificationsInput): Promise<Result<NotificationDto[], DomainError>> {
    const items = await this.notifications.findByCustomer(input.customerUid);
    return ok(items.map(toNotificationDto));
  }
}
