import { z } from "zod";
import { REVIEW_EVENTS } from "@/modules/reviews/lib/analytics";
import { REVIEW_SOURCES } from "@/modules/reviews/lib/constants";
import { PayloadError, readPayload, sameOrigin } from "@/modules/pixels/server/http";

const eventSchema = z.object({
  event: z.enum(REVIEW_EVENTS), source: z.enum(REVIEW_SOURCES),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  hasComment: z.boolean().optional(),
}).strict();

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
  if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") {
    return new Response(null, { status: 204, headers });
  }
  try {
    const parsed = eventSchema.safeParse(await readPayload(request));
    if (!parsed.success) return new Response(null, { status: 400, headers });
    // Structured first-party operational analytics. No comment, identity, IP or raw URL.
    console.info(JSON.stringify({ module: "reviews", ...parsed.data }));
    return new Response(null, { status: 204, headers });
  } catch (error) {
    return new Response(null, { status: error instanceof PayloadError ? error.status : 503, headers });
  }
}
