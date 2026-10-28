import type { DomainError } from "@/shared/domain/domain-error";
import { makeGetBusinessBySlug } from "@/core/tenancy/infrastructure/di/tenancy-container";
import type { BusinessDto } from "@/core/tenancy/application/dtos/business-dto";
import { statusForTenancyError } from "@/lib/auth/business-access-status";
import { ScanSecretMisconfiguredError, StampTooSoonError } from "@/modules/stamp-card/domain/errors/stamp-card-errors";

/** Shared pieces for the stamp-card API handlers. */

export const json = (body: Record<string, unknown>, status = 200): Response =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Maps a stamp error code to an HTTP status. Unknown codes are client errors,
 * never a success, so a new error can only fail closed.
 */
export function statusForStampError(code: string): number {
  switch (code) {
    case "stamps/not-a-customer":
      return 404;
    case "stamps/too-soon":
    case "stamps/reward-pending":
    case "stamps/no-reward":
    case "stamps/inactive":
    case "stamps/table-disabled":
      return 409;
    case "stamps/misconfigured":
      return 503;
    case "stamps/corrupt-card":
      return 500;
    default:
      return 400;
  }
}

/** A domain failure as a response, carrying the wait time when the cooldown applies. */
export function stampError(error: DomainError): Response {
  return json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof StampTooSoonError ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
      },
    },
    statusForStampError(error.code)
  );
}

/**
 * Runs a handler body and turns a missing signing secret into a clean 503
 * instead of a crash, since the use case factories read it lazily.
 */
export async function guardStampErrors(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ScanSecretMisconfiguredError) return stampError(error);
    throw error;
  }
}

/**
 * Resolves the business from the URL slug for a stamp feature. Stamp cards are
 * for restaurants and other non-supermarket businesses; a supermarket answers
 * as if the feature did not exist (it earns points instead).
 */
export async function resolveStampBusiness(
  slug: string
): Promise<{ ok: true; business: BusinessDto } | { ok: false; response: Response }> {
  const business = await makeGetBusinessBySlug().execute(slug);
  if (!business.ok) {
    return { ok: false, response: json({ ok: false, error: { code: business.error.code } }, statusForTenancyError(business.error.code)) };
  }
  if (business.value.kind === "supermarket") {
    return { ok: false, response: json({ ok: false, error: { code: "stamps/not-available" } }, 404) };
  }
  return { ok: true, business: business.value };
}

/**
 * For handlers that already passed the business gate, which resolved the
 * business: answers 404 for a supermarket without reading it again.
 */
export const stampsUnavailable = (business: BusinessDto): Response | null =>
  business.kind === "supermarket" ? json({ ok: false, error: { code: "stamps/not-available" } }, 404) : null;

/** Same-origin check for state-changing requests. */
export const isSameOrigin = (request: Request): boolean =>
  request.headers.get("origin") === new URL(request.url).origin;
