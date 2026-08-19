import { maskPhoneNumber } from "../ui/phone-format";

export function logCallEvent(event: string, fields: Record<string, unknown>): void {
  console.info(JSON.stringify({ event, ...sanitize(fields) }));
}

export function logCallError(event: string, error: unknown, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({
    event,
    ...sanitize(fields),
    error: error instanceof Error ? error.message : "Unknown error",
  }));
}

function sanitize(fields: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    typeof value === "string" && /phone|caller|from|to|destination/i.test(key)
      ? maskPhoneNumber(value)
      : value,
  ]));
}

