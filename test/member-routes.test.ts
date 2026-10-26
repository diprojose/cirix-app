import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ok } from "@/shared/domain/result";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";
import { isMemberApi, isMemberPage, requiresPlatformAccess } from "@/lib/auth/route-access";
import { parseAudience } from "@/lib/auth/audience";
import { statusForTenancyError } from "@/lib/auth/business-access-status";

const { platform, review, member } = vi.hoisted(() => ({ platform: vi.fn(), review: vi.fn(), member: vi.fn() }));
vi.mock("@/core/iam/infrastructure/di/iam-container", () => ({
  makeGetViewer: () => ({ execute: platform }),
  makeGetReviewViewer: () => ({ execute: review }),
  makeGetMemberViewer: () => ({ execute: member }),
}));
import { proxy } from "@/proxy";

const signedIn = ok({ ...guestViewer, authenticated: true, uid: "customer-1", email: "ana@example.com" });
const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`https://cirix.example${path}`, init);

beforeEach(() => {
  for (const viewer of [platform, review, member]) {
    viewer.mockReset();
    viewer.mockResolvedValue(ok(guestViewer));
  }
});

describe("member route matching", () => {
  it.each(["/me", "/b/cafe-luna", "/b/cafe-luna/", "/b/Cafe-Luna", "/biz/cafe-luna", "/biz/cafe-luna/scan", "/biz/cafe-luna/a/b/c"])(
    "treats %s as a member page",
    (path) => expect(isMemberPage(path)).toBe(true)
  );

  it.each(["/", "/me/other", "/b", "/b/", "/b/cafe/extra", "/b/caf e", "/biz", "/biz/", "/bizarre", "/admin", "/zoho", "/api/member/me/cards", "/ b/x"])(
    "keeps %s out of the member pages",
    (path) => expect(isMemberPage(path)).toBe(false)
  );

  it("only matches member APIs under their own prefix", () => {
    expect(isMemberApi("/api/member/me/cards")).toBe(true);
    expect(isMemberApi("/api/member/biz/x/customers")).toBe(true);
    expect(isMemberApi("/api/member")).toBe(false);
    expect(isMemberApi("/api/members/x")).toBe(false);
    expect(isMemberApi("/api/zoho/leads")).toBe(false);
  });
});

describe("root layout admission rule", () => {
  it.each(["/zoho", "/pixels", "/reviews", "/admin", "/calls", "/loyalty", "/cart", "/n8n", "/ai-support", "/zoho/leads"])(
    "still requires platform admission for %s",
    (path) => expect(requiresPlatformAccess(path)).toBe(true)
  );

  it.each(["/", "/login", "/review", "/make-a-review", "/me", "/b/cafe-luna", "/biz/cafe-luna", "/biz/cafe-luna/scan"])(
    "does not require platform admission for %s",
    (path) => expect(requiresPlatformAccess(path)).toBe(false)
  );

  it("agrees with the proxy: every member page is exempt in both barriers", () => {
    for (const path of ["/me", "/b/x1", "/biz/x1", "/biz/x1/deep/page"]) {
      expect(isMemberPage(path)).toBe(true);
      expect(requiresPlatformAccess(path)).toBe(false);
    }
  });
});

describe("proxy for member pages", () => {
  it("sends a guest to the login page and remembers where they were going", async () => {
    const response = await proxy(request("/es/b/cafe-luna?source=table_qr"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/es/login");
    expect(location.searchParams.get("from")).toBe("/es/b/cafe-luna?source=table_qr");
    expect(member).toHaveBeenCalledOnce();
    expect(platform).not.toHaveBeenCalled();
  });

  it.each(["/es/me", "/en/b/cafe-luna", "/es/biz/cafe-luna", "/es/biz/cafe-luna/scan"])(
    "lets a verified account reach %s without platform admission",
    async (path) => {
      member.mockResolvedValue(signedIn);
      const response = await proxy(request(path));
      expect(response.status).toBe(200);
      expect(platform).not.toHaveBeenCalled();
    }
  );

  it("never lets a member session open private platform modules", async () => {
    member.mockResolvedValue(signedIn);
    for (const path of ["/es/zoho", "/es/pixels", "/es/reviews", "/es/admin", "/es/calls", "/es/loyalty"]) {
      const response = await proxy(request(path));
      expect(response.status, path).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/es/login");
    }
    expect(member).not.toHaveBeenCalled();
  });

  it("keeps server actions on member pages private", async () => {
    member.mockResolvedValue(signedIn);
    const response = await proxy(request("/es/biz/cafe-luna", { method: "POST", headers: { "next-action": "do-it" } }));
    expect(response.status).toBe(401);
    expect(member).not.toHaveBeenCalled();
  });

  it("does not treat a similar-looking path as a member page", async () => {
    member.mockResolvedValue(signedIn);
    const response = await proxy(request("/es/biz"));
    expect(response.status).toBe(307);
    expect(member).not.toHaveBeenCalled();
  });

  it("redirects an unlocalized member URL after checking identity", async () => {
    member.mockResolvedValue(signedIn);
    const response = await proxy(request("/b/cafe-luna?source=table_qr", { headers: { "accept-language": "es" } }));
    expect(response.headers.get("location")).toBe("https://cirix.example/es/b/cafe-luna?source=table_qr");
  });
});

describe("proxy for member APIs", () => {
  it("answers 401 to a guest", async () => {
    for (const path of ["/api/member/me/cards", "/api/member/biz/cafe-luna/customers"]) {
      expect((await proxy(request(path))).status, path).toBe(401);
    }
    expect((await proxy(request("/api/member/businesses/cafe-luna/join", { method: "POST" }))).status).toBe(401);
  });

  it("admits a verified account, with no-store caching", async () => {
    member.mockResolvedValue(signedIn);
    const response = await proxy(request("/api/member/me/cards"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const write = await proxy(request("/api/member/businesses/cafe-luna/join", { method: "POST" }));
    expect(write.status).toBe(200);
  });

  it("does not let a member session reach the platform APIs", async () => {
    member.mockResolvedValue(signedIn);
    for (const path of ["/api/zoho/leads", "/api/calls", "/api/reviews/dashboard", "/api/pixels/sites"]) {
      expect((await proxy(request(path))).status, path).toBe(401);
    }
    expect(member).not.toHaveBeenCalled();
  });
});

describe("session audience", () => {
  it.each([
    ["member", "member"],
    ["reviews", "reviews"],
    ["platform", "platform"],
    ["admin", "platform"],
    ["", "platform"],
    [undefined, "platform"],
    [null, "platform"],
    [42, "platform"],
  ])("parses %j as %s", (value, expected) => {
    expect(parseAudience(value)).toBe(expected);
  });
});

describe("tenancy error statuses", () => {
  it("maps known errors and fails closed on unknown ones", () => {
    expect(statusForTenancyError("tenancy/not-found")).toBe(404);
    expect(statusForTenancyError("tenancy/access-denied")).toBe(403);
    expect(statusForTenancyError("tenancy/suspended")).toBe(403);
    expect(statusForTenancyError("something/new")).toBe(403);
  });
});
