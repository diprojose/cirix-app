import type { Redemption, RedemptionStatus } from "../../domain/entities/redemption";
import type { Reward } from "../../domain/entities/reward";

export type RewardDto = { id: string; name: string; description: string; points: number; active: boolean };

export const toRewardDto = ({ id, name, description, points, active }: Reward): RewardDto => ({ id, name, description, points, active });

export type RedemptionDto = {
  code: string;
  userId: string;
  rewardName: string;
  points: number;
  status: RedemptionStatus;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
};

export const toRedemptionDto = (redemption: Redemption, now: Date): RedemptionDto => {
  const { code, userId, rewardName, points, createdAt, expiresAt, resolvedAt } = redemption.toSnapshot();
  return { code, userId, rewardName, points, status: redemption.statusAt(now), createdAt, expiresAt, resolvedAt };
};

/** What staff see before handing a prize over. */
export type RedemptionPreviewDto = { code: string; firstName: string; rewardName: string; points: number };
