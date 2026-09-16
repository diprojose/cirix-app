import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Next 16.2.10 still exports the testing helper under its middleware name.
import { unstable_doesMiddlewareMatch as unstable_doesProxyMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";
import { detectPreferredLocale } from "@/lib/locale";
import { ok } from "@/shared/domain/result";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/core/iam/infrastructure/di/iam-container", () => ({ makeGetViewer: () => ({ execute }) }));
beforeEach(() => { execute.mockReset(); execute.mockResolvedValue(ok(guestViewer)); });

describe("search entry points", () => {
  it.each(["/favicon.ico", "/favicon.ico?v=1", "/icon.png", "/apple-icon.png", "/brand/favicon.svg", "/robots.txt", "/sitemap.xml"])(
    "serves %s without a locale redirect",
    async (url) => {
      const response = await proxy(new NextRequest(`https://www.cirixadv.com${url}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([null, "es-VE,es;q=0.9", "en-US,en;q=0.9"])(
    "uses the English homepage with language preference %s",
    async (language) => {
      const headers = new Headers();
      if (language) headers.set("accept-language", language);
      const response = await proxy(new NextRequest("https://www.cirixadv.com/?ref=search", { headers }));
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("https://www.cirixadv.com/en?ref=search");
    },
  );

  it.each([
    ["https://cirixadv.com/", "/en"],
    ["https://cirixadv.com/en", "/en"],
    ["https://cirixadv.com/es", "/es"],
    ["http://cirixadv.com/", "/en"],
    ["http://www.cirixadv.com/en", "/en"],
    ["http://www.cirixadv.com/es", "/es"],
  ])("permanently consolidates %s in one hop", async (url, path) => {
    for (const method of ["GET", "HEAD"]) {
      const response = await proxy(new NextRequest(`${url}?utm_source=google&ref=search`, {
        method, headers: { "accept-language": "es" },
      }));
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`https://www.cirixadv.com${path}?utm_source=google&ref=search`);
      const destination = await proxy(new NextRequest(response.headers.get("location")!, { method }));
      expect(destination.status).toBe(200);
      expect(destination.headers.get("location")).toBeNull();
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["http://localhost:3000", "https://cirix-preview.vercel.app"])(
    "keeps development and preview navigation on %s", async (origin) => {
      const root = await proxy(new NextRequest(`${origin}/`));
      expect(root.status).toBe(308);
      expect(root.headers.get("location")).toBe(`${origin}/en`);
      const localized = await proxy(new NextRequest(`${origin}/es`));
      expect(localized.status).toBe(200);
      expect(localized.headers.get("location")).toBeNull();
    },
  );

  it("keeps preference-based localization temporary", async () => {
    const response = await proxy(new NextRequest("https://cirixadv.com/login", { headers: { "accept-language": "es" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://cirixadv.com/es/login");
  });

  it("authenticates landing actions before any canonical redirect", async () => {
    const response = await proxy(new NextRequest("https://cirixadv.com/es", {
      method: "POST", headers: { "next-action": "test-action" },
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(execute).toHaveBeenCalled();
  });

  it("preserves explicitly selected Spanish", async () => {
    const response = await proxy(new NextRequest("https://www.cirixadv.com/es"));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-mixmag-locale")).toBe("es");
  });

  it("still protects private pages", async () => {
    const url = "/en/admin";
    expect(unstable_doesProxyMatch({ config, nextConfig: {}, url })).toBe(true);
    const response = await proxy(new NextRequest(`https://www.cirixadv.com${url}`));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("from")).toBe(url);
  });

  it.each([
    [null, "en"],
    ["fr-FR", "en"],
    ["es-VE,es;q=0.9,en;q=0.8", "es"],
    ["es;q=0.5,en-US;q=0.9", "en"],
    ["en;q=0,es;q=0.8", "es"],
  ])("respects supported language preferences on other routes: %s", (header, expected) => {
    expect(detectPreferredLocale(header)).toBe(expected);
  });
});
