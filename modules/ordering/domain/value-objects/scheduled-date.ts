import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidScheduledDateError } from "../errors/ordering-errors";

/** Props backing a {@link ScheduledDate} value object. */
type ScheduledDateProps = {
  readonly value: string;
};

/**
 * ScheduledDate is the calendar day the customer expects delivery or pickup.
 * Everything in the store is made to order, so every order carries one. It is
 * a plain ISO date (`YYYY-MM-DD`, no time, no timezone) validated to be a real
 * calendar day; whether the day is acceptable relative to "today" is a policy
 * checked at the application layer, where the current date is known.
 */
export class ScheduledDate extends ValueObject<ScheduledDateProps> {
  private constructor(props: ScheduledDateProps) {
    super(props);
  }

  /** Builds a ScheduledDate, validating format and calendar validity. */
  static create(value: string): Result<ScheduledDate, DomainError> {
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) {
      return err(
        new InvalidScheduledDateError("Scheduled date must be an ISO date (YYYY-MM-DD).")
      );
    }

    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const isRealDay =
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day);
    if (!isRealDay) {
      return err(new InvalidScheduledDateError("Scheduled date is not a real calendar day."));
    }

    return ok(new ScheduledDate({ value: trimmed }));
  }

  /** ISO date string (YYYY-MM-DD). */
  get value(): string {
    return this.props.value;
  }

  /** True when this date is strictly before the given ISO date (lexicographic works for ISO). */
  isBefore(isoDate: string): boolean {
    return this.props.value < isoDate;
  }
}
