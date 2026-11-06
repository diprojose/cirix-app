import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidReceiptSettingsError } from "../errors/receipt-errors";

type ReceiptSettingsProps = {
  enabled: boolean;
  /** How the business appears on its receipts: name or address. Empty means the business name. */
  storeNames: string[];
  /** The Merchant IDs printed on its card slips; the most reliable proof of where a receipt is from. */
  merchantIds: string[];
  maxAgeDays: number;
  /** Totals above this are refused, whatever caused them: OCR misreads a total now and then. */
  maxAmountDollars: number;
  /** Supermarkets: points per whole dollar spent. */
  pointsPerDollar: number;
  /** Supermarkets: receipts one customer can use per day. Restaurants use the card's wait instead. */
  dailyLimit: number;
};

export type ReceiptSettingsInput = ReceiptSettingsProps;

export const RECEIPT_LIMITS = {
  maxStoreNames: 5,
  minStoreName: 3,
  maxStoreName: 60,
  maxMerchantIds: 5,
  minMaxAgeDays: 1,
  maxMaxAgeDays: 30,
  minMaxAmountDollars: 1,
  maxMaxAmountDollars: 100_000,
  minPointsPerDollar: 1,
  maxPointsPerDollar: 100,
  minDailyLimit: 1,
  maxDailyLimit: 20,
} as const;

const inRange = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

/** A business's rules for receipts. Off until the owner turns it on. */
export class ReceiptSettings extends ValueObject<ReceiptSettingsProps> {
  private constructor(props: ReceiptSettingsProps) {
    super(props);
  }

  static create(input: ReceiptSettingsInput): Result<ReceiptSettings, DomainError> {
    const limits = RECEIPT_LIMITS;
    const storeNames = [...new Set(input.storeNames.map((name) => name.trim().replace(/\s+/g, " ")).filter(Boolean))];
    const merchantIds = [...new Set(input.merchantIds.map((id) => id.replace(/\D/g, "")).filter(Boolean))];
    if (storeNames.length > limits.maxStoreNames || storeNames.some((name) => name.length < limits.minStoreName || name.length > limits.maxStoreName)) {
      return err(new InvalidReceiptSettingsError(`Up to ${limits.maxStoreNames} store names of ${limits.minStoreName}-${limits.maxStoreName} characters.`));
    }
    if (merchantIds.length > limits.maxMerchantIds || merchantIds.some((id) => id.length < 4 || id.length > 30)) {
      return err(new InvalidReceiptSettingsError(`Up to ${limits.maxMerchantIds} Merchant IDs of 4-30 digits.`));
    }
    if (!inRange(input.maxAgeDays, limits.minMaxAgeDays, limits.maxMaxAgeDays)) {
      return err(new InvalidReceiptSettingsError(`Receipt age must be ${limits.minMaxAgeDays}-${limits.maxMaxAgeDays} days.`));
    }
    if (!inRange(input.maxAmountDollars, limits.minMaxAmountDollars, limits.maxMaxAmountDollars)) {
      return err(new InvalidReceiptSettingsError(`Top amount must be ${limits.minMaxAmountDollars}-${limits.maxMaxAmountDollars} dollars.`));
    }
    if (!inRange(input.pointsPerDollar, limits.minPointsPerDollar, limits.maxPointsPerDollar)) {
      return err(new InvalidReceiptSettingsError(`Points per dollar must be ${limits.minPointsPerDollar}-${limits.maxPointsPerDollar}.`));
    }
    if (!inRange(input.dailyLimit, limits.minDailyLimit, limits.maxDailyLimit)) {
      return err(new InvalidReceiptSettingsError(`Daily limit must be ${limits.minDailyLimit}-${limits.maxDailyLimit}.`));
    }
    return ok(new ReceiptSettings({ ...input, storeNames, merchantIds }));
  }

  static defaults(): ReceiptSettings {
    return new ReceiptSettings({
      enabled: false,
      storeNames: [],
      merchantIds: [],
      maxAgeDays: 2,
      maxAmountDollars: 500,
      pointsPerDollar: 2,
      dailyLimit: 3,
    });
  }

  /** Points a total earns; part of a dollar's worth rounds down. */
  pointsFor(totalCents: number): number {
    return Math.floor((totalCents * this.props.pointsPerDollar) / 100);
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get storeNames(): readonly string[] {
    return this.props.storeNames;
  }

  get merchantIds(): readonly string[] {
    return this.props.merchantIds;
  }

  get maxAgeDays(): number {
    return this.props.maxAgeDays;
  }

  get maxAmountDollars(): number {
    return this.props.maxAmountDollars;
  }

  get pointsPerDollar(): number {
    return this.props.pointsPerDollar;
  }

  get dailyLimit(): number {
    return this.props.dailyLimit;
  }
}
