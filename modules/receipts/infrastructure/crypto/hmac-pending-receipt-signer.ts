import { createHmac, timingSafeEqual } from "node:crypto";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PendingReceipt, PendingReceiptSigner } from "../../domain/ports/receipt-ports";
import { InvalidReceiptConfirmationError, ReceiptConfirmationExpiredError } from "../../domain/errors/receipt-errors";

/** Time to look at the total and tap "yes", with room for a slow connection. */
export const PENDING_RECEIPT_TTL_SECONDS = 10 * 60;

const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 4000;
const VERSION = "r1";
/** Separates these signatures from the customer QR codes signed with the same secret. */
const DOMAIN = "receipt-confirm.v1.";

const isText = (value: unknown, max = 200): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const isOptionalText = (value: unknown): value is string | null => value === null || isText(value);

/**
 * HMAC-SHA256 implementation of {@link PendingReceiptSigner}: `r1.<payload>.<signature>`.
 * The payload is the whole reading plus its expiry, so confirming needs no
 * storage, and the signature proves the browser changed nothing in it.
 */
export class HmacPendingReceiptSigner implements PendingReceiptSigner {
  constructor(private readonly secret: string) {
    if (secret.length < MIN_SECRET_LENGTH) throw new Error("STAMP_QR_SECRET must have at least 32 characters.");
  }

  sign(pending: PendingReceipt, now: Date): string {
    const e = Math.floor(now.getTime() / 1000) + PENDING_RECEIPT_TTL_SECONDS;
    const payload = Buffer.from(JSON.stringify({ ...pending, e })).toString("base64url");
    return `${VERSION}.${payload}.${this.mac(payload)}`;
  }

  verify(token: string, now: Date): Result<PendingReceipt, DomainError> {
    if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return err(new InvalidReceiptConfirmationError());
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return err(new InvalidReceiptConfirmationError());
    const [, payload, signature] = parts;

    const expected = Buffer.from(this.mac(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return err(new InvalidReceiptConfirmationError());
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return err(new InvalidReceiptConfirmationError());
    }
    const valid =
      isText(data.businessId) &&
      isText(data.userId) &&
      Number.isSafeInteger(data.totalCents) &&
      (data.totalCents as number) > 0 &&
      isText(data.date, 10) &&
      isOptionalText(data.transactionId) &&
      isOptionalText(data.merchantId) &&
      Array.isArray(data.keys) &&
      data.keys.every((key) => isText(key, 300)) &&
      typeof data.demo === "boolean" &&
      isText(data.nonce) &&
      typeof data.e === "number";
    if (!valid) return err(new InvalidReceiptConfirmationError());
    if (now.getTime() >= (data.e as number) * 1000) return err(new ReceiptConfirmationExpiredError());

    const { businessId, userId, totalCents, date, transactionId, merchantId, keys, demo, nonce } = data as PendingReceipt;
    return ok({ businessId, userId, totalCents, date, transactionId, merchantId, keys, demo, nonce });
  }

  private mac(payload: string): string {
    return createHmac("sha256", this.secret).update(DOMAIN + payload).digest("base64url");
  }
}
