import type { ReceiptSettings } from "../../domain/value-objects/receipt-settings";

export type ReceiptSettingsDto = {
  enabled: boolean;
  storeNames: string[];
  merchantIds: string[];
  maxAgeDays: number;
  maxAmountDollars: number;
  pointsPerDollar: number;
  dailyLimit: number;
};

export const toReceiptSettingsDto = (settings: ReceiptSettings): ReceiptSettingsDto => ({
  enabled: settings.enabled,
  storeNames: [...settings.storeNames],
  merchantIds: [...settings.merchantIds],
  maxAgeDays: settings.maxAgeDays,
  maxAmountDollars: settings.maxAmountDollars,
  pointsPerDollar: settings.pointsPerDollar,
  dailyLimit: settings.dailyLimit,
});

export type ScanRewardDto =
  | { kind: "stamp"; stamps: number; required: number; rewardUnlocked: boolean }
  | { kind: "points"; earned: number; balance: number };

export type ScanReceiptDto = {
  totalCents: number;
  date: string;
  reward: ScanRewardDto;
};

export type PointsSummaryDto = {
  balance: number;
  totalEarned: number;
  entries: { id: string; delta: number; balance: number; reason: "receipt" | "redemption" | "refund"; at: string }[];
};
