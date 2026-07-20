import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidRewardRulesError } from "../errors/rewards-errors";

/** Props backing a {@link RewardRules} value object. */
type RewardRulesProps = {
  readonly earnRatePctOfMargin: number;
  readonly holdbackDays: number;
  readonly expiryDays: number;
  readonly maxRedeemPctOfOrder: number;
};

/**
 * RewardRules is the operator-tunable configuration of the loyalty program,
 * validated as a whole so an impossible setting can never be persisted. It is
 * the single source of the earn rate (as a % of margin, BR-01), the holdback
 * window (BR-02), the expiry window (BR-04) and the per-order redemption cap
 * (BR-05). Changes apply only to future transactions — nothing here rewrites
 * lines already in the ledger (BR-18).
 */
export class RewardRules extends ValueObject<RewardRulesProps> {
  private constructor(props: RewardRulesProps) {
    super(props);
  }

  /** Builds validated rules. Fails with a Result on any out-of-range value. */
  static create(input: {
    earnRatePctOfMargin: number;
    holdbackDays: number;
    expiryDays: number;
    maxRedeemPctOfOrder: number;
  }): Result<RewardRules, DomainError> {
    const { earnRatePctOfMargin, holdbackDays, expiryDays, maxRedeemPctOfOrder } = input;

    if (!isPct(earnRatePctOfMargin)) {
      return err(new InvalidRewardRulesError("Earn rate must be a percentage between 0 and 100."));
    }
    if (!Number.isInteger(holdbackDays) || holdbackDays < 0) {
      return err(new InvalidRewardRulesError("Holdback must be a whole number of days ≥ 0."));
    }
    if (!Number.isInteger(expiryDays) || expiryDays < 1) {
      return err(new InvalidRewardRulesError("Expiry must be a whole number of days ≥ 1."));
    }
    if (!isPct(maxRedeemPctOfOrder)) {
      return err(new InvalidRewardRulesError("Redeem cap must be a percentage between 0 and 100."));
    }

    return ok(
      new RewardRules({ earnRatePctOfMargin, holdbackDays, expiryDays, maxRedeemPctOfOrder })
    );
  }

  /** Earn as a % of the order margin, e.g. 5 means 5%. */
  get earnRatePctOfMargin(): number {
    return this.props.earnRatePctOfMargin;
  }

  /** Days a freshly earned line stays `pending` before it can be released. */
  get holdbackDays(): number {
    return this.props.holdbackDays;
  }

  /** Days after which an unused available line expires. */
  get expiryDays(): number {
    return this.props.expiryDays;
  }

  /** Maximum share of an order's subtotal that credit may pay for (BR-05). */
  get maxRedeemPctOfOrder(): number {
    return this.props.maxRedeemPctOfOrder;
  }

  /** The earn, in minor units, for a given order margin. Rounded to the cent. */
  earnFor(marginCents: number): number {
    if (marginCents <= 0) return 0;
    return Math.round((this.props.earnRatePctOfMargin / 100) * marginCents);
  }

  /** The redemption ceiling, in minor units, for a given order subtotal. */
  maxRedeemFor(orderSubtotalCents: number): number {
    return Math.floor((this.props.maxRedeemPctOfOrder / 100) * Math.max(0, orderSubtotalCents));
  }
}

/** Whether a value is a finite percentage in [0, 100]. */
const isPct = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value <= 100;
