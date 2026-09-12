import { beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "@/shared/domain/result";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";
import { PlatformAccessDeniedError, SessionCreationError } from "@/core/iam/domain/errors/iam-errors";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), viewer: vi.fn(), revoke: vi.fn(), cookieSet: vi.fn(), cookieDelete: vi.fn(), cookieGet: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.cookieSet, delete: mocks.cookieDelete, get: mocks.cookieGet }) }));
vi.mock("@/core/iam/infrastructure/di/iam-container", () => ({
  makeCreateSession: () => ({ execute: mocks.create }),
  makeGetViewer: () => ({ execute: mocks.viewer }),
  makeRevokeSession: () => ({ execute: mocks.revoke }),
}));
vi.mock("@/shared/infrastructure/firebase-admin", () => ({ adminAuth: vi.fn() }));
vi.mock("@/modules/loyalty/referrals/infrastructure/di/referrals-container", () => ({ makeRegisterReferral: vi.fn() }));
import { POST, DELETE } from "@/app/api/auth/session/route";

const request = (origin = "https://cirix.example", method = "POST") => new Request("https://cirix.example/api/auth/session", {
  method, headers: { origin, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ idToken: "token" }) } : {}),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue(ok({ cookie: "minted", expiresAt: Date.now() + 60000 }));
  mocks.viewer.mockResolvedValue(ok({ ...guestViewer, authenticated: true, uid: "approved" }));
});

describe("session exchange boundary", () => {
  it("rejects login CSRF before token exchange", async () => {
    expect((await POST(request("https://attacker.example"))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
  it("rejects cross-origin logout before revocation", async () => {
    expect((await DELETE(request("https://attacker.example", "DELETE"))).status).toBe(403);
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });
  it("returns a clear forbidden result without setting a cookie for unapproved users", async () => {
    mocks.create.mockResolvedValue(err(new PlatformAccessDeniedError()));
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "iam/access-denied" } });
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).toHaveBeenCalledWith("session");
  });
  it("returns 401 for invalid tokens", async () => {
    mocks.create.mockResolvedValue(err(new SessionCreationError()));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
  it("does not publish a cookie if access is revoked during session exchange", async () => {
    mocks.viewer.mockResolvedValue(ok(guestViewer));
    expect((await POST(request())).status).toBe(403);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
  it("sets only the validated httpOnly session and preserves the role landing", async () => {
    mocks.viewer.mockResolvedValue(ok({ ...guestViewer, authenticated: true, permissions: { canOperateStore: true } }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, landing: "/admin" });
    expect(mocks.viewer).toHaveBeenCalledWith({ sessionCookie: "minted" });
    expect(mocks.cookieSet).toHaveBeenCalledWith("session", "minted", expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
  });
  it("allows same-origin logout and clears the cookie", async () => {
    mocks.cookieGet.mockReturnValue({ value: "session-cookie" });
    expect((await DELETE(request("https://cirix.example", "DELETE"))).status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith({ sessionCookie: "session-cookie" });
    expect(mocks.cookieDelete).toHaveBeenCalledWith("session");
  });
});
