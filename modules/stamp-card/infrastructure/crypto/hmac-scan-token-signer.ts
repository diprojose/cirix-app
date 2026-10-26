import { createHmac, timingSafeEqual } from "node:crypto";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { IssuedScanToken, ScanSubject, ScanTokenSigner } from "../../domain/ports/scan-token-signer";
import {
  ExpiredScanTokenError,
  InvalidScanTokenError,
  ScanSecretMisconfiguredError,
} from "../../domain/errors/stamp-card-errors";

/** A code is valid for 90 seconds: long enough to scan and confirm, too short to share. */
export const SCAN_TOKEN_TTL_SECONDS = 90;

const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 600;
const VERSION = "v1";
/** Separates these signatures from any other use of the same secret. */
const DOMAIN = "stamp-scan.v1.";

/**
 * HMAC-SHA256 implementation of {@link ScanTokenSigner}. A token is
 * `v1.<payload>.<signature>`; the payload names the business, the person and
 * the expiry, and the signature proves the server issued it. Verification
 * compares signatures in constant time and never reveals which check failed
 * beyond "expired" versus "not valid".
 */
export class HmacScanTokenSigner implements ScanTokenSigner {
  constructor(private readonly secret: string) {
    // A short secret would make forging a code feasible; refuse to run with one.
    if (secret.length < MIN_SECRET_LENGTH) throw new ScanSecretMisconfiguredError();
  }

  sign(subject: ScanSubject, now: Date): IssuedScanToken {
    const expiresAtSeconds = Math.floor(now.getTime() / 1000) + SCAN_TOKEN_TTL_SECONDS;
    const payload = Buffer.from(
      JSON.stringify({ b: subject.businessId, u: subject.userId, e: expiresAtSeconds })
    ).toString("base64url");
    return {
      token: `${VERSION}.${payload}.${this.mac(payload)}`,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    };
  }

  verify(token: string, now: Date): Result<ScanSubject, DomainError> {
    if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return err(new InvalidScanTokenError());
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return err(new InvalidScanTokenError());
    const [, payload, signature] = parts;

    const expected = Buffer.from(this.mac(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return err(new InvalidScanTokenError());
    }

    let parsed: { b?: unknown; u?: unknown; e?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return err(new InvalidScanTokenError());
    }
    if (typeof parsed.b !== "string" || typeof parsed.u !== "string" || typeof parsed.e !== "number" || !parsed.b || !parsed.u) {
      return err(new InvalidScanTokenError());
    }
    if (now.getTime() >= parsed.e * 1000) return err(new ExpiredScanTokenError());
    return ok({ businessId: parsed.b, userId: parsed.u });
  }

  private mac(payload: string): string {
    return createHmac("sha256", this.secret).update(DOMAIN + payload).digest("base64url");
  }
}
