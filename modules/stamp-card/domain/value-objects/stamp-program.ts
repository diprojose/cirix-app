import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidStampProgramError } from "../errors/stamp-card-errors";

type StampProgramProps = {
  requiredStamps: number;
  rewardName: string;
  cooldownMinutes: number;
  active: boolean;
};

export type StampProgramInput = {
  requiredStamps: number;
  rewardName: string;
  cooldownMinutes: number;
  active?: boolean;
};

/** Bounds that keep a program sensible and the antifraud cooldown meaningful. */
export const STAMP_LIMITS = {
  minStamps: 3,
  maxStamps: 30,
  minRewardName: 2,
  maxRewardName: 60,
  /**
   * The cooldown must outlast a scan code's lifetime: that is what stops a
   * screenshot or a double scan from adding a second stamp.
   */
  minCooldownMinutes: 5,
  maxCooldownMinutes: 1440,
} as const;

/**
 * StampProgram is a business's rules for its stamp card: how many stamps earn
 * the reward, what the reward is, and how long a customer must wait between
 * stamps. A business that has not configured one gets the defaults.
 */
export class StampProgram extends ValueObject<StampProgramProps> {
  private constructor(props: StampProgramProps) {
    super(props);
  }

  static create(input: StampProgramInput): Result<StampProgram, DomainError> {
    const { requiredStamps, cooldownMinutes } = input;
    const rewardName = input.rewardName.trim().replace(/\s+/g, " ");
    if (!Number.isInteger(requiredStamps) || requiredStamps < STAMP_LIMITS.minStamps || requiredStamps > STAMP_LIMITS.maxStamps) {
      return err(new InvalidStampProgramError(`Stamps needed must be a whole number from ${STAMP_LIMITS.minStamps} to ${STAMP_LIMITS.maxStamps}.`));
    }
    if (rewardName.length < STAMP_LIMITS.minRewardName || rewardName.length > STAMP_LIMITS.maxRewardName) {
      return err(new InvalidStampProgramError(`Reward name must be ${STAMP_LIMITS.minRewardName}-${STAMP_LIMITS.maxRewardName} characters.`));
    }
    if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < STAMP_LIMITS.minCooldownMinutes || cooldownMinutes > STAMP_LIMITS.maxCooldownMinutes) {
      return err(new InvalidStampProgramError(`Wait between stamps must be ${STAMP_LIMITS.minCooldownMinutes}-${STAMP_LIMITS.maxCooldownMinutes} minutes.`));
    }
    return ok(new StampProgram({ requiredStamps, rewardName, cooldownMinutes, active: input.active ?? true }));
  }

  /** The program a business gets before it configures one. */
  static defaults(): StampProgram {
    return new StampProgram({ requiredStamps: 10, rewardName: "Free item", cooldownMinutes: 240, active: true });
  }

  get requiredStamps(): number {
    return this.props.requiredStamps;
  }

  get rewardName(): string {
    return this.props.rewardName;
  }

  get cooldownMinutes(): number {
    return this.props.cooldownMinutes;
  }

  get active(): boolean {
    return this.props.active;
  }
}
