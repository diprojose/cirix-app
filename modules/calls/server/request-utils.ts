export async function readFormParams(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") {
    throw new Error("Unsupported webhook content type.");
  }
  const params = new URLSearchParams(await request.text());
  return Object.fromEntries(params.entries());
}

export function publicRequestUrl(request: Request, baseUrl: string | null): string {
  const incoming = new URL(request.url);
  if (baseUrl) return `${baseUrl}${incoming.pathname}${incoming.search}`;

  const forwarded = request.headers.get("forwarded")?.split(",", 1)[0];
  const forwardedProto = forwarded?.match(/(?:^|;)\s*proto=([^;]+)/i)?.[1]?.replaceAll('"', "");
  const forwardedHost = forwarded?.match(/(?:^|;)\s*host=([^;]+)/i)?.[1]?.replaceAll('"', "");
  const proto = forwardedProto ?? request.headers.get("x-forwarded-proto")?.split(",", 1)[0].trim();
  const host = forwardedHost ?? request.headers.get("x-forwarded-host")?.split(",", 1)[0].trim();
  return proto && host ? `${proto}://${host}${incoming.pathname}${incoming.search}` : request.url;
}

export function callbackUrl(baseRequestUrl: string): string {
  const url = new URL(baseRequestUrl);
  url.pathname = "/api/webhooks/twilio/call-status";
  url.search = "";
  return url.toString();
}

