import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/resend/route";
import { isServiceEndpoint } from "@/lib/auth/route-access";

const emailId = "12345678-1234-4123-8123-123456789abc";
const key = Buffer.from("local-test-signing-key-only");
const event = { type: "email.received", data: { email_id: emailId, to: ["ventas@cirixad.com"] } };
const fetchMock = vi.fn();
function request(payload: unknown = event, timestamp = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", key).update(`msg_test.${timestamp}.${body}`).digest("base64");
  return new Request("https://cirixadv.com/api/webhooks/resend", {
    method: "POST", body,
    headers: { "svix-id": "msg_test", "svix-timestamp": String(timestamp), "svix-signature": `v1,${signature}` },
  });
}
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", `whsec_${key.toString("base64")}`);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Resend inbound forwarding", () => {
  it("exempts only the signed webhook path from session authentication", () => {
    expect(isServiceEndpoint("/api/webhooks/resend")).toBe(true);
    expect(isServiceEndpoint("/api/webhooks/resend/other")).toBe(false);
  });
  it("fails closed without configuration or a valid, recent signature", async () => {
    expect((await POST(new Request("https://example.com", { method: "POST", body: JSON.stringify(event) }))).status).toBe(400);
    expect((await POST(request(event, 1))).status).toBe(400);
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("ignores other events and unrelated recipient domains", async () => {
    expect((await POST(request({ type: "email.delivered" }))).status).toBe(200);
    expect((await POST(request({ ...event, data: { ...event.data, to: ["a@cirixad.com.evil.test"] } }))).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("forwards signed events to the fixed Gmail with reply address, attachment and retry key", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: emailId, to: event.data.to, subject: "Consulta", raw: { download_url: "https://storage.example.com/message" } }));
    const raw = ["From: Client <client@example.com>", "Reply-To: reply@example.com", "To: ventas@cirixad.com", "Subject: Consulta", "MIME-Version: 1.0", "Content-Type: multipart/mixed; boundary=test", "", "--test", "Content-Type: text/plain; charset=utf-8", "", "Hola", "--test", "Content-Type: text/plain", "Content-Disposition: attachment; filename=note.txt", "Content-Transfer-Encoding: base64", "", "YWJj", "--test--", ""].join("\r\n");
    fetchMock.mockResolvedValueOnce(new Response(raw));
    fetchMock.mockResolvedValueOnce(Response.json({ id: "sent-email" }));
    expect((await POST(request())).status).toBe(200);
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("idempotency-key")).toBe(`cirix-forward/${emailId}`);
    expect(JSON.parse(init.body)).toMatchObject({
      from: "Cirix Mail <forward@cirixad.com>", to: "ciro.advertising@gmail.com",
      reply_to: ["reply@example.com"], subject: "Consulta",
      attachments: [{ filename: "note.txt", content: "YWJj" }],
    });
  });
  it("returns retryable failures instead of acknowledging unforwarded mail", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "temporarily unavailable", name: "application_error" }, { status: 500 }));
    expect((await POST(request())).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects oversized payloads before making network calls", async () => {
    expect((await POST(request({ ...event, padding: "x".repeat(66000) }))).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
