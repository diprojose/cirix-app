import { StampCard } from "../../domain/entities/stamp-card";
import type { StampProgram } from "../../domain/value-objects/stamp-program";

/** Plain, serializable view of a customer's card for pages and API responses. */
export type StampCardDto = {
  /** Stamps in the current cycle, never above `required`. */
  stamps: number;
  required: number;
  rewardName: string;
  rewardReady: boolean;
  redeemedCount: number;
  totalStamps: number;
  /** False while the business has paused its program. */
  active: boolean;
  /** True when the customer may stamp their own card with the table QR. */
  tableStamps: boolean;
  canStamp: boolean;
  canRedeem: boolean;
  /** Seconds before the next stamp is allowed, or 0. */
  retryAfterSeconds: number;
  lastStampAt: string | null;
};

export type StampProgramDto = {
  requiredStamps: number;
  rewardName: string;
  cooldownMinutes: number;
  active: boolean;
  tableStamps: boolean;
};

/** A person with no card yet is shown an empty one, so the first stamp needs no setup. */
export function toStampCardDto(
  card: StampCard | null,
  program: StampProgram,
  businessId: string,
  userId: string,
  now: Date
): StampCardDto {
  const current = card ?? StampCard.empty(businessId, userId, now);
  const status = current.status(program, now);
  return {
    stamps: current.displayStamps(program),
    required: program.requiredStamps,
    rewardName: program.rewardName,
    rewardReady: current.isRewardReady(program),
    redeemedCount: current.redeemedCount,
    totalStamps: current.totalStamps,
    active: program.active,
    tableStamps: program.tableStamps,
    canStamp: status.canStamp,
    canRedeem: status.canRedeem,
    retryAfterSeconds: status.retryAfterSeconds,
    lastStampAt: current.lastStampAt,
  };
}

export const toStampProgramDto = (program: StampProgram): StampProgramDto => ({
  requiredStamps: program.requiredStamps,
  rewardName: program.rewardName,
  cooldownMinutes: program.cooldownMinutes,
  active: program.active,
  tableStamps: program.tableStamps,
});
