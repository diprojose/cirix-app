import { makeCallTrackingDependencies } from "@/modules/calls/infrastructure/di/calls-container";
import { handleStatusWebhook } from "@/modules/calls/server/webhook-handlers";

export async function POST(request: Request) {
  try {
    const deps = makeCallTrackingDependencies();
    return handleStatusWebhook(request, {
      service: deps.service,
      provider: deps.provider,
      accountSid: deps.config.accountSid,
      webhookBaseUrl: deps.config.webhookBaseUrl,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "twilio.call.status.configuration.failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }));
    return new Response(null, { status: 500 });
  }
}

