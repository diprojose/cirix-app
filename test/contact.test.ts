import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptureCommercialLead, toZohoPayload } from "@/modules/zoho/crm/application/use-cases/capture-commercial-lead";
import { ok, err } from "@/shared/domain/result";
import { CrmLeadSyncFailedError } from "@/modules/zoho/crm/domain/errors/crm-errors";
import type { CommercialLeadInput } from "@/modules/zoho/crm/application/dtos/commercial-lead-dto";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/modules/zoho/crm/infrastructure/di/crm-container", () => ({
  makeCaptureCommercialLead: () => ({ execute }),
}));
import { POST, OPTIONS } from "@/app/api/contact/route";

const payload = {
  name: "Ada Lovelace", email: "ada@example.com", company: "Analytical Engines",
  service_needed: "Website Design", message: "We need a website.",
};
function request(body: unknown = payload, origin = "https://cirixad.com") {
  return new Request("https://crm.example.com/api/contact", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => { execute.mockReset(); vi.unstubAllEnvs(); });

describe("website contact endpoint", () => {
  it("allows preflight for the website and rejects unrelated origins before writing", async () => {
    expect(OPTIONS(request()).status).toBe(204);
    const response = await POST(request(payload, "https://unrelated.example"));
    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
  it("supports configured local origins", () => {
    vi.stubEnv("CONTACT_ALLOWED_ORIGINS", "http://localhost:8080");
    expect(OPTIONS(request(payload, "http://localhost:8080")).status).toBe(204);
  });
  it("maps all website fields into the CRM with a server-controlled source", async () => {
    execute.mockResolvedValue(ok({ syncStatus: "synced" }));
    const response = await POST(request({ ...payload, campaign: "fall", source: "spoofed" }));
    expect(response.status).toBe(201);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://cirixad.com");
    expect(execute).toHaveBeenCalledWith({
      fullName: payload.name, email: payload.email, company: payload.company, phone: "",
      interestCategory: payload.service_needed, message: payload.message,
      source: "CirixAd.com contact form", campaign: "fall", locale: "en",
    });
    expect(await response.json()).toEqual({ ok: true, syncStatus: "synced" });
  });
  it.each([null, [], {}, { ...payload, email: "bad" }, { ...payload, phone: "123" }, { ...payload, message: 5 }])(
    "rejects invalid fields without writes: %j", async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(execute).not.toHaveBeenCalled();
    }
  );
  it("rejects oversized requests and malformed JSON", async () => {
    expect((await POST(request({ ...payload, message: "x".repeat(17000) }))).status).toBe(413);
    expect((await POST(new Request("https://crm.example.com/api/contact", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }))).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
  it("ignores honeypot submissions", async () => {
    expect((await POST(request({ ...payload, _honey: "bot" }))).status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });
  it("acknowledges a stored inquiry when Zoho synchronization fails", async () => {
    execute.mockResolvedValue(err(new CrmLeadSyncFailedError("private upstream error")));
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, syncStatus: "failed" });
  });
  it("does not acknowledge receipt on a database failure or expose internals", async () => {
    execute.mockRejectedValue(new Error("private database details"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, message: "We could not send your message. Please try again." });
  });
});

describe("commercial lead capture", () => {
  function setup() {
    const leads = {
      findLatestByContact: vi.fn().mockResolvedValue(null),
      createPending: vi.fn().mockResolvedValue({ id: "local-1", submittedAt: "2026-09-12" }),
      markSynced: vi.fn(), markFailed: vi.fn(),
    };
    const zoho = { upsertLead: vi.fn().mockResolvedValue({ zohoLeadId: "zoho-1" }) };
    return { leads, zoho, usecase: new CaptureCommercialLead(leads, zoho) };
  }
  const input = { fullName: payload.name, phone: "", email: "ADA@example.com", company: payload.company, source: "CirixAd.com contact form" };
  it("captures email-only leads and maps the actual company to Zoho", async () => {
    const { usecase, zoho, leads } = setup();
    expect((await usecase.execute(input)).ok).toBe(true);
    expect(leads.findLatestByContact).toHaveBeenCalledWith("ada@example.com", "");
    const normalized = zoho.upsertLead.mock.calls[0][0].lead;
    expect(toZohoPayload(normalized)).toMatchObject({ Company: payload.company, Email: "ada@example.com" });
    expect(toZohoPayload(normalized)).not.toHaveProperty("Phone");
    expect(leads.markSynced).toHaveBeenCalledWith("local-1", "zoho-1", expect.any(String));
  });
  it("preserves phone-only capture for the existing CRM form", async () => {
    const { usecase } = setup();
    expect((await usecase.execute({ ...input, phone: "+12395550123", email: "" })).ok).toBe(true);
  });
  it.each([null, {}, { ...input, phone: "", email: "" }, { ...input, email: 123 }])(
    "rejects malformed or unreachable leads: %j", async (body) => {
      const { usecase, leads } = setup();
      expect((await usecase.execute(body as CommercialLeadInput)).ok).toBe(false);
      expect(leads.createPending).not.toHaveBeenCalled();
    }
  );
  it("retains the inquiry and marks a failed Zoho sync", async () => {
    const { usecase, zoho, leads } = setup();
    zoho.upsertLead.mockRejectedValue(new Error("Zoho unavailable"));
    expect((await usecase.execute(input)).ok).toBe(false);
    expect(leads.createPending).toHaveBeenCalledOnce();
    expect(leads.markFailed).toHaveBeenCalledWith("local-1", "Zoho unavailable");
  });
});
