import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidRewardError } from "../errors/receipt-errors";

/** One prize in a supermarket's catalog. */
export type Reward = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  /** What it costs. A redemption keeps the price it was made at, so changing this never touches open codes. */
  points: number;
  /** A hidden prize stays out of the customer's catalog, and its open codes still work. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RewardInput = { name: string; description: string; points: number; active: boolean };

export const REWARD_LIMITS = {
  minName: 2,
  maxName: 80,
  maxDescription: 200,
  minPoints: 1,
  maxPoints: 1_000_000,
  maxRewards: 50,
} as const;

/** Applies the catalog's rules to what the owner typed. */
export function buildReward(
  input: RewardInput,
  identity: { id: string; businessId: string; createdAt?: string },
  now: Date
): Result<Reward, DomainError> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const description = input.description.trim();
  if (name.length < REWARD_LIMITS.minName || name.length > REWARD_LIMITS.maxName) {
    return err(new InvalidRewardError(`The name must be ${REWARD_LIMITS.minName}-${REWARD_LIMITS.maxName} characters.`));
  }
  if (description.length > REWARD_LIMITS.maxDescription) {
    return err(new InvalidRewardError(`The description can have up to ${REWARD_LIMITS.maxDescription} characters.`));
  }
  if (!Number.isInteger(input.points) || input.points < REWARD_LIMITS.minPoints || input.points > REWARD_LIMITS.maxPoints) {
    return err(new InvalidRewardError(`Points must be a whole number from ${REWARD_LIMITS.minPoints} to ${REWARD_LIMITS.maxPoints}.`));
  }
  const at = now.toISOString();
  return ok({
    id: identity.id,
    businessId: identity.businessId,
    name,
    description,
    points: input.points,
    active: input.active,
    createdAt: identity.createdAt ?? at,
    updatedAt: at,
  });
}
