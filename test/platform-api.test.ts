import { beforeEach, describe, expect, it, vi } from "vitest";
import { guestViewer } from "@/core/iam/application/dtos/viewer-dto";
const getViewer = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/dal", () => ({ getViewer }));
import { checkApiAccess } from "@/lib/auth/api-access";

beforeEach(() => { getViewer.mockReset(); });
describe("business API admission", () => {
  it("fails closed for anonymous or revoked viewers", async () => {
    getViewer.mockResolvedValue(guestViewer);
    const response = await checkApiAccess();
    expect(response?.status).toBe(401);
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });
  it("allows an authorized customer into regular modules but not operator diagnostics", async () => {
    getViewer.mockResolvedValue({ ...guestViewer, authenticated: true });
    expect(await checkApiAccess()).toBeNull();
    expect((await checkApiAccess(true))?.status).toBe(403);
  });
  it("allows current operators into diagnostics", async () => {
    getViewer.mockResolvedValue({ ...guestViewer, authenticated: true, permissions: { canOperateStore: true } });
    expect(await checkApiAccess(true)).toBeNull();
  });
});
