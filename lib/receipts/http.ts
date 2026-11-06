import type { DomainError } from "@/shared/domain/domain-error";
import { ReceiptOutOfDateError, ReceiptUnreadableError } from "@/modules/receipts/domain/errors/receipt-errors";
import { StampTooSoonError } from "@/modules/stamp-card/domain/errors/stamp-card-errors";
import { json } from "@/lib/stamps/http";

/** Maps a receipt error code to an HTTP status. Unknown codes are client errors, so a new one fails closed. */
export function statusForReceiptError(code: string): number {
  switch (code) {
    case "receipts/not-a-customer":
      return 404;
    case "receipts/too-many-attempts":
      return 429;
    case "receipts/invalid-image":
    case "receipts/invalid-settings":
      return 400;
    case "receipts/corrupt-points":
    case "stamps/corrupt-card":
      return 500;
    default:
      return code.startsWith("receipts/") || code.startsWith("stamps/") ? 409 : 400;
  }
}

/** A failure as a response, with whatever the screen needs to explain it. */
export function receiptError(error: DomainError): Response {
  return json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ReceiptUnreadableError ? { missing: error.missing } : {}),
        ...(error instanceof ReceiptOutOfDateError ? { maxAgeDays: error.maxAgeDays } : {}),
        ...(error instanceof StampTooSoonError ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
      },
    },
    statusForReceiptError(error.code)
  );
}
