import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidBusinessError } from "../errors/tenancy-errors";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 40;

/** Names that could be confused with platform areas or infrastructure. */
export const RESERVED_SLUGS: readonly string[] = [
  "admin", "api", "app", "b", "biz", "me", "login", "logout", "es", "en", "www",
  "demo", "zoho", "pixels", "reviews", "review", "make-a-review", "calls", "n8n",
  "loyalty", "cart", "checkout", "orders", "ai-support", "static", "assets",
];

const RESERVED = new Set<string>(RESERVED_SLUGS);

type BusinessSlugProps = { value: string };

/**
 * BusinessSlug is the public, URL-safe name of a business (`/b/<slug>`): lower
 * case letters, digits and single hyphens, 3 to 40 characters, never a reserved
 * word. It is how a QR code finds the business; it is not a secret and carries
 * no authority by itself.
 */
export class BusinessSlug extends ValueObject<BusinessSlugProps> {
  private constructor(props: BusinessSlugProps) {
    super(props);
  }

  /** Validates and normalizes user-provided text into a slug. */
  static create(raw: string): Result<BusinessSlug, DomainError> {
    const value = raw.trim().toLowerCase();
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
      return err(new InvalidBusinessError(`Address must be ${MIN_LENGTH}-${MAX_LENGTH} characters.`));
    }
    if (!SLUG_PATTERN.test(value)) {
      return err(new InvalidBusinessError("Address may only use letters, digits and single hyphens."));
    }
    if (RESERVED.has(value)) {
      return err(new InvalidBusinessError(`"${value}" is a reserved address.`));
    }
    return ok(new BusinessSlug({ value }));
  }

  get value(): string {
    return this.props.value;
  }
}
