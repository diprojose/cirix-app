import type { ReceiptReading } from "../../domain/services/verify-receipt";
import type { ReceiptSettings } from "../../domain/value-objects/receipt-settings";

export type ReceiptSettingsDto = {
  enabled: boolean;
  storeNames: string[];
  merchantIds: string[];
  maxAgeDays: number;
  maxAmountDollars: number;
  pointsPerDollar: number;
  dailyLimit: number;
  demoMode: boolean;
};

export const toReceiptSettingsDto = (settings: ReceiptSettings): ReceiptSettingsDto => ({
  enabled: settings.enabled,
  storeNames: [...settings.storeNames],
  merchantIds: [...settings.merchantIds],
  maxAgeDays: settings.maxAgeDays,
  maxAmountDollars: settings.maxAmountDollars,
  pointsPerDollar: settings.pointsPerDollar,
  dailyLimit: settings.dailyLimit,
  demoMode: settings.demoMode,
});

export type ScanRewardDto =
  | { kind: "stamp"; stamps: number; required: number; rewardUnlocked: boolean }
  | { kind: "points"; earned: number; balance: number }
  /** Demo mode only: the receipt was read, but the card could not take a stamp right now. */
  | { kind: "none"; code: string; retryAfterSeconds: number | null };

export type ScanReceiptDto = {
  totalCents: number;
  date: string;
  reward: ScanRewardDto;
  /** Demo mode only: everything that was read from the photo. */
  read?: ReceiptReading;
};

export type PointsSummaryDto = {
  balance: number;
  totalEarned: number;
  entries: { id: string; delta: number; balance: number; reason: "receipt" | "redemption" | "refund"; at: string }[];
};
