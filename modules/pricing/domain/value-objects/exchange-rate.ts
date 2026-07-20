import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidExchangeRateError } from "../errors/pricing-errors";

/** Where a rate came from: the live BCV feed, the operator's manual rate, or
 * the static fallback baked into the deploy. */
export type ExchangeRateSource = "bcv" | "manual" | "fallback";

/** Props backing an {@link ExchangeRate} value object. */
type ExchangeRateProps = {
  readonly vesPerUsd: number;
  readonly source: ExchangeRateSource;
  readonly asOf: string;
};

/**
 * ExchangeRate is an immutable value object holding the official USD→VES rate
 * (bolívares per one US dollar) used to display and freeze prices in local
 * currency. Its factory guarantees a positive, finite rate and an ISO date, so
 * an unusable rate cannot exist. Orders snapshot this value at creation time —
 * they never re-read a live rate.
 */
export class ExchangeRate extends ValueObject<ExchangeRateProps> {
  private constructor(props: ExchangeRateProps) {
    super(props);
  }

  /** Builds an ExchangeRate, validating rate and date. Fails with a Result on invalid input. */
  static create(
    vesPerUsd: number,
    source: ExchangeRateSource,
    asOf: string
  ): Result<ExchangeRate, DomainError> {
    if (!Number.isFinite(vesPerUsd) || vesPerUsd <= 0) {
      return err(
        new InvalidExchangeRateError("Exchange rate must be a positive, finite number.")
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      return err(
        new InvalidExchangeRateError("Exchange rate date must be an ISO date (YYYY-MM-DD).")
      );
    }

    return ok(new ExchangeRate({ vesPerUsd, source, asOf }));
  }

  get vesPerUsd(): number {
    return this.props.vesPerUsd;
  }

  get source(): ExchangeRateSource {
    return this.props.source;
  }

  /** ISO date (YYYY-MM-DD) the rate was published for. */
  get asOf(): string {
    return this.props.asOf;
  }
}
