import type { CallTrackingService } from "../application/call-tracking-service";
import { CallTrackingError } from "../application/call-tracking-service";
import type { TelephonyProvider } from "../domain/telephony-provider";
import { logCallError, logCallEvent } from "./call-logger";
import { callbackUrl, publicRequestUrl, readFormParams } from "./request-utils";

export type WebhookDependencies = {
  service: CallTrackingService;
  provider: TelephonyProvider;
  accountSid: string;
  webhookBaseUrl: string | null;
};

export async function handleIncomingWebhook(request: Request, deps: WebhookDependencies): Promise<Response> {
  const parsed = await parseAndValidate(request, deps);
  if (parsed instanceof Response) return parsed;
  const { params, requestUrl } = parsed;

  if (params.AccountSid !== deps.accountSid) return new Response("Forbidden", { status: 403 });

  try {
    const call = await deps.service.registerIncoming({
      callSid: params.CallSid ?? "",
      accountSid: params.AccountSid ?? "",
      from: params.From ?? "",
      to: params.To ?? "",
      direction: params.Direction ?? "",
    });
    logCallEvent("twilio.call.incoming", {
      callSid: call.providerCallId,
      callerPhone: call.callerPhone,
      status: call.status,
    });
    return xmlResponse(deps.provider.createForwardResponse({
      destinationNumber: call.destinationPhone,
      statusCallbackUrl: callbackUrl(requestUrl),
    }));
  } catch (error) {
    if (error instanceof CallTrackingError && error.code === "calls/invalid-account") {
      return new Response("Forbidden", { status: 403 });
    }
    logCallError("twilio.call.incoming.failed", error, { callSid: params.CallSid });
    return xmlResponse(deps.provider.createHangupResponse());
  }
}

export async function handleStatusWebhook(request: Request, deps: WebhookDependencies): Promise<Response> {
  const parsed = await parseAndValidate(request, deps);
  if (parsed instanceof Response) return parsed;
  const { params } = parsed;
  if (params.AccountSid !== deps.accountSid) return new Response("Forbidden", { status: 403 });

  try {
    const call = await deps.service.recordStatus({
      callSid: params.CallSid ?? "",
      parentCallSid: params.ParentCallSid || null,
      callStatus: params.CallStatus ?? "",
      sequenceNumber: params.SequenceNumber || null,
      callDuration: params.CallDuration || params.Duration || null,
    });
    logCallEvent("twilio.call.status", {
      callSid: params.CallSid,
      status: params.CallStatus,
      matched: Boolean(call),
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    logCallError("twilio.call.status.failed", error, { callSid: params.CallSid, status: params.CallStatus });
    return new Response(null, { status: error instanceof CallTrackingError ? 400 : 500 });
  }
}

async function parseAndValidate(request: Request, deps: WebhookDependencies) {
  let params: Record<string, string>;
  try {
    params = await readFormParams(request);
  } catch {
    return new Response("Expected application/x-www-form-urlencoded", { status: 415 });
  }
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const requestUrl = publicRequestUrl(request, deps.webhookBaseUrl);
  if (!signature || !deps.provider.validateWebhook({ signature, url: requestUrl, params })) {
    return new Response("Forbidden", { status: 403 });
  }
  return { params, requestUrl };
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" },
  });
}

