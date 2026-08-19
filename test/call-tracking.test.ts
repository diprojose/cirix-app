import { describe, expect, it } from "vitest";
import twilio from "twilio";
import { CallTrackingService, type CallTrackingRuntimeConfig } from "@/modules/calls/application/call-tracking-service";
import type { BusinessPhoneNumber, CallStatus } from "@/modules/calls/domain/call";
import type { TelephonyProvider, WebhookValidationInput } from "@/modules/calls/domain/telephony-provider";
import {
  InMemoryBusinessPhoneNumberRepository,
  InMemoryCallRepository,
} from "@/modules/calls/infrastructure/persistence/in-memory-call-repository";
import { TwilioProvider } from "@/modules/calls/infrastructure/providers/twilio-provider";
import { presentCall } from "@/modules/calls/server/api-presenters";
import { publicRequestUrl } from "@/modules/calls/server/request-utils";
import { handleIncomingWebhook } from "@/modules/calls/server/webhook-handlers";
import { maskPhoneNumber } from "@/modules/calls/ui/phone-format";

const TRACKING = "+17372212163";
const DESTINATION = "+584143154836";
const CALLER = "+584121234567";
const ACCOUNT = "AC_TEST_ACCOUNT";

function setup() {
  const calls = new InMemoryCallRepository();
  const phone: BusinessPhoneNumber = {
    id: `twilio:${TRACKING}`,
    businessId: "default",
    provider: "twilio",
    trackingPhone: TRACKING,
    destinationPhone: DESTINATION,
    active: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  let clock = new Date("2026-08-19T13:25:01.000Z");
  const config: CallTrackingRuntimeConfig = {
    businessId: "default",
    accountSid: ACCOUNT,
    trackingPhone: TRACKING,
    fallbackDestinationPhone: DESTINATION,
    timeZone: "America/Caracas",
    trialMode: true,
  };
  const service = new CallTrackingService(
    calls,
    new InMemoryBusinessPhoneNumberRepository([phone]),
    config,
    () => clock
  );
  return { calls, service, setClock: (value: string) => { clock = new Date(value); } };
}

function incoming(callSid = "CA_PARENT") {
  return { callSid, accountSid: ACCOUNT, from: CALLER, to: TRACKING, direction: "inbound" };
}

class FakeProvider implements TelephonyProvider {
  valid = true;
  validateWebhook(input: WebhookValidationInput) { void input; return this.valid; }
  createForwardResponse(options: { destinationNumber: string; statusCallbackUrl: string }) {
    return `<Response><Dial answerOnBridge="true"><Number statusCallback="${options.statusCallbackUrl}">${options.destinationNumber}</Number></Dial></Response>`;
  }
  createHangupResponse() { return "<Response><Hangup/></Response>"; }
}

describe("incoming Twilio calls", () => {
  it("creates one inbound call, stores From/To/destination, and remains idempotent", async () => {
    const { calls, service } = setup();
    const first = await service.registerIncoming(incoming());
    const repeated = await service.registerIncoming(incoming());

    expect(repeated.id).toBe(first.id);
    expect(first).toMatchObject({ callerPhone: CALLER, trackingPhone: TRACKING, destinationPhone: DESTINATION, status: "initiated" });
    expect(await calls.listByBusiness("default")).toHaveLength(1);
  });

  it("rejects invalid E.164 values and unknown tracking numbers", async () => {
    const { service } = setup();
    await expect(service.registerIncoming({ ...incoming(), from: "0412-1234567" })).rejects.toMatchObject({ code: "calls/invalid-phone" });
    await expect(service.registerIncoming({ ...incoming(), to: "+17370000000" })).rejects.toMatchObject({ code: "calls/destination-unavailable" });
  });

  it("returns signed forwarding TwiML and rejects invalid signatures without writes", async () => {
    const { calls, service } = setup();
    const provider = new FakeProvider();
    const deps = { service, provider, accountSid: ACCOUNT, webhookBaseUrl: "https://calls.example" };
    const body = new URLSearchParams({ CallSid: "CA_WEBHOOK", AccountSid: ACCOUNT, From: CALLER, To: TRACKING, Direction: "inbound", CallStatus: "ringing" });
    const request = () => new Request("http://localhost/api/webhooks/twilio/voice", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": "signature" }, body });

    provider.valid = false;
    expect((await handleIncomingWebhook(request(), deps)).status).toBe(403);
    expect(await calls.listByBusiness("default")).toHaveLength(0);

    provider.valid = true;
    const response = await handleIncomingWebhook(request(), deps);
    const xml = await response.text();
    expect(response.headers.get("content-type")).toContain("text/xml");
    expect(xml).toContain("<Dial");
    expect(xml).toContain(DESTINATION);
    expect(xml).not.toContain("record=");
    expect(await calls.listByBusiness("default")).toHaveLength(1);
  });
});

describe("Twilio status callbacks", () => {
  it("relates the child leg, fills timestamps and duration, and ignores older events", async () => {
    const { service, setClock } = setup();
    const created = await service.registerIncoming(incoming());
    setClock("2026-08-19T13:25:02.000Z");
    await service.recordStatus({ callSid: "CA_CHILD", parentCallSid: "CA_PARENT", callStatus: "ringing", sequenceNumber: "1", callDuration: null });
    setClock("2026-08-19T13:25:07.000Z");
    await service.recordStatus({ callSid: "CA_CHILD", parentCallSid: "CA_PARENT", callStatus: "in-progress", sequenceNumber: "2", callDuration: null });
    setClock("2026-08-19T13:29:31.000Z");
    const completed = await service.recordStatus({ callSid: "CA_CHILD", parentCallSid: "CA_PARENT", callStatus: "completed", sequenceNumber: "3", callDuration: "264" });
    setClock("2026-08-19T13:30:00.000Z");
    const stale = await service.recordStatus({ callSid: "CA_CHILD", parentCallSid: "CA_PARENT", callStatus: "ringing", sequenceNumber: "1", callDuration: null });

    expect(completed).toMatchObject({ providerChildCallId: "CA_CHILD", ringingAt: "2026-08-19T13:25:02.000Z", answeredAt: "2026-08-19T13:25:07.000Z", endedAt: "2026-08-19T13:29:31.000Z", durationSeconds: 264, status: "completed" });
    expect(stale?.status).toBe("completed");
    expect(stale?.ringingAt).toBe(completed?.ringingAt);
    expect(created.providerCallId).toBe("CA_PARENT");
  });

  it.each(["no-answer", "busy", "failed", "canceled"] as const)("keeps %s as a distinct missed final state", async (twilioStatus) => {
    const { service, setClock } = setup();
    await service.registerIncoming(incoming(`CA_${twilioStatus}`));
    setClock("2026-08-19T13:26:00.000Z");
    const updated = await service.recordStatus({ callSid: `CHILD_${twilioStatus}`, parentCallSid: `CA_${twilioStatus}`, callStatus: twilioStatus, sequenceNumber: "3", callDuration: null });
    expect(updated?.status).toBe(twilioStatus.replace("-", "_") as CallStatus);
    expect(updated?.answeredAt).toBeNull();
    expect(updated?.endedAt).not.toBeNull();
  });
});

describe("call reporting and privacy", () => {
  it("calculates repeat callers and safe zero-call stats", async () => {
    const { service } = setup();
    expect(await service.stats(null, null)).toMatchObject({ totalCalls: 0, uniqueCallers: 0, answerRate: 0, averageDurationSeconds: 0 });
    await service.registerIncoming(incoming("CA_1"));
    await service.registerIncoming(incoming("CA_2"));
    await service.registerIncoming(incoming("CA_3"));
    expect(await service.stats(null, null)).toMatchObject({ totalCalls: 3, uniqueCallers: 1, repeatCalls: 2 });
  });

  it("masks list phones and allow-lists API fields without account credentials", async () => {
    const { service } = setup();
    const call = await service.registerIncoming(incoming());
    expect(maskPhoneNumber(CALLER)).toBe("+58 *** *** 4567");
    expect(presentCall(call)).not.toHaveProperty("providerAccountId");
    expect(JSON.stringify(presentCall(call))).not.toContain(ACCOUNT);
  });
});

describe("Twilio provider and proxy URL handling", () => {
  it("validates an official SDK signature and generates Dial without recording", () => {
    const token = "test_auth_token";
    const url = "https://calls.example/api/webhooks/twilio/voice";
    const params = { CallSid: "CA123", From: CALLER, To: TRACKING };
    const signature = twilio.getExpectedTwilioSignature(token, url, params);
    const provider = new TwilioProvider(token);
    expect(provider.validateWebhook({ signature, url, params })).toBe(true);
    const xml = provider.createForwardResponse({ destinationNumber: DESTINATION, statusCallbackUrl: "https://calls.example/api/webhooks/twilio/call-status" });
    expect(xml).toContain("answerOnBridge=\"true\"");
    expect(xml).toContain("initiated ringing answered completed");
    expect(xml).not.toContain("record=");
  });

  it("prefers configured public base URL and reconstructs trusted proxy origins", () => {
    const request = new Request("http://internal/api/webhooks/twilio/voice?tenant=1", { headers: { "x-forwarded-proto": "https", "x-forwarded-host": "public.example" } });
    expect(publicRequestUrl(request, "https://configured.example")).toBe("https://configured.example/api/webhooks/twilio/voice?tenant=1");
    expect(publicRequestUrl(request, null)).toBe("https://public.example/api/webhooks/twilio/voice?tenant=1");
  });
});
