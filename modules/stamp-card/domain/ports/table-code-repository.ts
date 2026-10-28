/** The secret printed inside a business's table QR, and when it was issued. */
export type TableCode = { code: string; createdAt: string };

/**
 * TableCodeRepository keeps each business's table code. The code goes inside the
 * printed QR, so it is not secret from anyone who sat at a table; its job is to
 * be replaceable. When a photo of the QR leaks, the owner issues a new code and
 * reprints, and every copy of the old one stops working.
 */
export interface TableCodeRepository {
  /** The current code, created on first use. Concurrent first calls agree on one code. */
  current(businessId: string): Promise<TableCode>;

  /** Replaces the code with a new random one. */
  rotate(businessId: string): Promise<TableCode>;
}

/**
 * Compares a scanned code with the stored one in constant time, so response
 * timing reveals nothing about how much of a guess was right.
 */
export function tableCodeMatches(expected: string, given: string): boolean {
  let difference = expected.length ^ given.length;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected.charCodeAt(index) ^ (given.charCodeAt(index % Math.max(1, given.length)) || 0);
  }
  return difference === 0;
}
