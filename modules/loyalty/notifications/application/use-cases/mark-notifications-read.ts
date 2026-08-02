import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { NotificationRepository } from "../../domain/repositories/notification-repository";

/** Input for {@link MarkNotificationsRead}: whose inbox to clear. */
export type MarkNotificationsReadInput = { customerUid: string };

/**
 * Marks all of a customer's notifications read — invoked when they open their
 * inbox, so the unread badge clears.
 */
export class MarkNotificationsRead implements UseCase<MarkNotificationsReadInput, void> {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(input: MarkNotificationsReadInput): Promise<Result<void, DomainError>> {
    await this.notifications.markAllRead(input.customerUid);
    return ok(undefined);
  }
}
