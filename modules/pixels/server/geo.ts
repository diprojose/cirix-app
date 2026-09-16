import type { PixelEvent } from "../domain/pixel";

/** Vercel supplies coarse location at the edge. Never store IP or client-supplied geo. */
export function coarseLocation(headers: Headers): PixelEvent["geo"] {
  if (process.env.VERCEL !== "1") return undefined;
  const country = headers.get("x-vercel-ip-country") ?? "";
  if (!/^[A-Z]{2}$/.test(country)) return undefined;
  const region = headers.get("x-vercel-ip-country-region") ?? "";
  return { country, ...(/^[A-Z0-9]{1,3}$/.test(region) ? { region } : {}) };
}
