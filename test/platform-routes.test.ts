import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ok } from "@/shared/domain/result";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";
const execute = vi.hoisted(() => vi.fn());
vi.mock("@/core/iam/infrastructure/di/iam-container", () => ({ makeGetViewer: () => ({ execute }) }));
import { proxy, config } from "@/proxy";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

beforeEach(() => { execute.mockReset(); execute.mockResolvedValue(ok(guestViewer)); });
const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`https://cirix.example${path}`, init);

describe("private platform routes", () => {
  it.each(["/es", "/en", "/es/login", "/en/login", "/brand/logo-white.svg", "/favicon.ico"])("keeps the landing, login and public assets reachable: %s", async (path) => {
    expect((await proxy(request(path))).status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });
  it("localizes the public root without requiring a session", async () => {
    expect((await proxy(request("/"))).headers.get("location")).toBe("https://cirix.example/es");
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(["/es/zoho", "/en/n8n", "/es/ai-support", "/es/calls", "/es/loyalty", "/es/demo/mercado-fresco", "/es/demo/mercado-fresco/login", "/es/demo/mercado-fresco/admin/settings", "/es/orders/test", "/es/offline", "/es/new-module", "/es/demo/test/admin/settings.svg"])("rejects direct navigation, including demos and future routes: %s", async (path) => {
    const response = await proxy(request(path));
    expect(response.status).toBe(307);
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe(path.startsWith("/en/") ? "/en/login" : "/es/login");
    expect(destination.searchParams.get("from")).toBe(path);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("verifies cookie content instead of trusting its presence", async () => {
    const response = await proxy(request("/es/zoho?tab=leads", { headers: { cookie: "session=forged" } }));
    expect(execute).toHaveBeenCalledWith({ sessionCookie: "forged" });
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).searchParams.get("from")).toBe("/es/zoho?tab=leads");
  });
  it.each(["/api/zoho/crm", "/api/calls", "/api/ai-support/chat", "/api/new-module"])("returns JSON 401 for unauthenticated API access: %s", async (path) => {
    const response = await proxy(request(path));
    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
  });
  it("rejects server actions posted to an otherwise public landing", async () => {
    expect((await proxy(request("/es", { method: "POST", headers: { "next-action": "action-id" } }))).status).toBe(401);
  });
  it("allows admitted users and overwrites client-supplied route headers", async () => {
    execute.mockResolvedValue(ok({ ...guestViewer, authenticated: true, uid: "approved" }));
    const response = await proxy(request("/es/zoho", { headers: { cookie: "session=valid", "x-mixmag-pathname": "/" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-mixmag-pathname")).toBe("/zoho");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it.each(["/api/auth/session", "/api/contact", "/api/webhooks/twilio/voice", "/api/webhooks/twilio/call-status", "/api/cron/rewards"])("leaves service-specific authentication to its handler: %s", async (path) => {
    expect((await proxy(request(path))).status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(["/es/zoho", "/api/zoho/crm", "/es/demo/x/admin/settings.svg", "/es/demo/x/app-icon.png", "/es/offline"])("matcher covers protected paths and extension variants: %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });
});
