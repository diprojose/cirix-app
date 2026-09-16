import { trackingInput } from "@/modules/reviews/domain/reviews";
import { recordReviewEvent } from "@/modules/reviews/server/repository";
import { PayloadError, readPayload, sameOrigin } from "@/modules/pixels/server/http";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1" ||
    /bot|crawler|spider|preview|facebookexternalhit|whatsapp/i.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204, headers });
  }
  try {
    const parsed = trackingInput.safeParse(await readPayload(request));
    if (!parsed.success) return new Response(null, { status: 400, headers });
    const result = await recordReviewEvent(parsed.data);
    return new Response(null, { status: result === "limited" ? 429 : 204,
      headers: result === "limited" ? { ...headers, "Retry-After": "60" } : headers });
  } catch (error) { return new Response(null, { status: error instanceof PayloadError ? error.status : 503, headers }); }
}
