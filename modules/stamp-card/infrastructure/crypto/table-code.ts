import { randomBytes } from "node:crypto";

/** A new table code: 96 random bits, URL-safe, 16 characters. */
export const newTableCode = (): string => randomBytes(12).toString("base64url");
