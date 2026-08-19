import { makeCallTrackingDependencies } from "@/modules/calls/infrastructure/di/calls-container";
import { handleIncomingWebhook } from "@/modules/calls/server/webhook-handlers";

export async function POST(request: Request) {
  try {
    const deps = makeCallTrackingDependencies();
    return handleIncomingWebhook(request, {
      service: deps.service,
      provider: deps.provider,
      accountSid: deps.config.accountSid,
      webhookBaseUrl: deps.config.webhookBaseUrl,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "twilio.call.configuration.failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', {
      status: 200,
      headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

