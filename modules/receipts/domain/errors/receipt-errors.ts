import { DomainError } from "@/shared/domain/domain-error";

/** Settings out of range. */
export class InvalidReceiptSettingsError extends DomainError {
  readonly code = "receipts/invalid-settings";
}

/** The business has not turned receipt scanning on. */
export class ReceiptsDisabledError extends DomainError {
  readonly code = "receipts/disabled";

  constructor() {
    super("This business does not accept receipts.");
  }
}

/** Only people who joined the business can earn from a receipt. */
export class ReceiptNotACustomerError extends DomainError {
  readonly code = "receipts/not-a-customer";

  constructor() {
    super("This person is not a customer of this business.");
  }
}

/** The upload is not an image we can open. */
export class InvalidReceiptImageError extends DomainError {
  readonly code = "receipts/invalid-image";

  constructor() {
    super("The file is not a readable image.");
  }
}

export type ReceiptField = "total" | "date" | "id";

/** The photo was read, but something the receipt must prove could not be found on it. */
export class ReceiptUnreadableError extends DomainError {
  readonly code = "receipts/unreadable";

  constructor(readonly missing: readonly ReceiptField[]) {
    super(`Could not read from the receipt: ${missing.join(", ")}.`);
  }
}

/** The receipt names another business. */
export class ReceiptWrongStoreError extends DomainError {
  readonly code = "receipts/wrong-store";

  constructor() {
    super("This receipt is not from this business.");
  }
}

/** The receipt's date falls outside the window the business accepts. */
export class ReceiptOutOfDateError extends DomainError {
  readonly code = "receipts/out-of-date";

  constructor(readonly maxAgeDays: number) {
    super(`Only receipts from the last ${maxAgeDays} days count.`);
  }
}

/** Someone already used this receipt, in this business. */
export class ReceiptAlreadyUsedError extends DomainError {
  readonly code = "receipts/already-used";

  constructor() {
    super("This receipt was already used.");
  }
}

/** The total is above what the business accepts automatically: probably a misread, or a forgery. */
export class ReceiptAmountTooHighError extends DomainError {
  readonly code = "receipts/amount-too-high";

  constructor() {
    super("The total on this receipt is above the accepted limit.");
  }
}

/** The customer reached the receipts one person can use in a day. */
export class ReceiptDailyLimitError extends DomainError {
  readonly code = "receipts/daily-limit";

  constructor() {
    super("The daily receipt limit was reached.");
  }
}

/** Reading a photo is the expensive part, so attempts are capped per person and day. */
export class ReceiptTooManyAttemptsError extends DomainError {
  readonly code = "receipts/too-many-attempts";

  constructor() {
    super("Too many receipt attempts today.");
  }
}

/** Stored data that the rules say cannot exist. */
export class CorruptPointsAccountError extends DomainError {
  readonly code = "receipts/corrupt-points";
}

/** A catalog prize out of range. */
export class InvalidRewardError extends DomainError {
  readonly code = "rewards/invalid";
}

/** The prize does not exist, or is no longer offered. */
export class RewardNotFoundError extends DomainError {
  readonly code = "rewards/not-found";

  constructor() {
    super("This reward is not available.");
  }
}

/** The catalog reached its size limit. */
export class RewardCatalogFullError extends DomainError {
  readonly code = "rewards/catalog-full";

  constructor(limit: number) {
    super(`A catalog can have up to ${limit} rewards.`);
  }
}

/** The balance does not cover the prize. */
export class NotEnoughPointsError extends DomainError {
  readonly code = "rewards/not-enough-points";

  constructor() {
    super("There aren't enough points for this reward.");
  }
}

/** What was scanned or typed is not a redemption code at all. */
export class InvalidRedemptionCodeError extends DomainError {
  readonly code = "rewards/invalid-code";

  constructor() {
    super("This isn't a reward code.");
  }
}

/** The code is well formed, but this business never issued it to this person. */
export class RedemptionNotFoundError extends DomainError {
  readonly code = "rewards/code-not-found";

  constructor() {
    super("This reward code does not exist at this business.");
  }
}

export class RedemptionDeliveredError extends DomainError {
  readonly code = "rewards/already-delivered";

  constructor() {
    super("This reward was already handed over.");
  }
}

export class RedemptionCancelledError extends DomainError {
  readonly code = "rewards/cancelled";

  constructor() {
    super("This reward code was cancelled.");
  }
}

export class RedemptionExpiredError extends DomainError {
  readonly code = "rewards/expired";

  constructor() {
    super("This reward code expired and the points went back.");
  }
}
