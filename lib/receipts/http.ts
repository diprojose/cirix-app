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
    case "rewards/invalid":
    case "rewards/invalid-code":
      return 400;
    case "rewards/not-found":
    case "rewards/code-not-found":
      return 404;
    case "receipts/corrupt-points":
    case "stamps/corrupt-card":
      return 500;
    default:
      return code.startsWith("receipts/") || code.startsWith("stamps/") || code.startsWith("rewards/") ? 409 : 400;
  }
}

/** Reads a small JSON body, answering for the usual ways it can be wrong. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, response: json({ ok: false, error: { code: "request/too-large" } }, 413) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ ok: false, error: { code: "request/invalid-json" } }, 400) };
  }
}

/** Catalogs and prize codes belong to supermarkets; elsewhere the feature does not exist. */
export const rewardsUnavailable = (business: { kind: string }): Response | null =>
  business.kind === "supermarket" ? null : json({ ok: false, error: { code: "rewards/not-available" } }, 404);

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
