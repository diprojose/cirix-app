import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getBusiness = vi.fn();
const getDesign = vi.fn();
vi.mock("@/core/tenancy/infrastructure/di/tenancy-container", () => ({
  makeGetBusinessBySlug: () => ({ execute: getBusiness }),
}));
vi.mock("@/modules/card-design/infrastructure/card-design-container", () => ({
  makeGetCardDesign: () => ({ execute: getDesign }),
}));

const { businessFromReturnPath, loadLoginBusinessBrand } = await import("@/lib/auth/login-business");

describe("businessFromReturnPath", () => {
  it("reads the business from its signup page and from a card", () => {
    expect(businessFromReturnPath("/b/cafe-demo")).toEqual({ slug: "cafe-demo", purpose: "join" });
    expect(businessFromReturnPath("/b/Cafe-Demo/")).toEqual({ slug: "cafe-demo", purpose: "join" });
    expect(businessFromReturnPath("/me/cards/cafe-demo")).toEqual({ slug: "cafe-demo", purpose: "card" });
    expect(businessFromReturnPath("/me/points/super-demo")).toEqual({ slug: "super-demo", purpose: "card" });
  });

  it("ignores every other destination", () => {
    for (const path of [null, "/", "/me", "/biz/cafe-demo", "/b/cafe-demo/extra", "/admin", "/b/", "/me/cards/"]) {
      expect(businessFromReturnPath(path)).toBeNull();
    }
  });
});

describe("loadLoginBusinessBrand", () => {
  beforeEach(() => {
    getBusiness.mockReset();
    getDesign.mockReset();
  });

  it("borrows the business's name, colour and logo", async () => {
    getBusiness.mockResolvedValue({ ok: true, value: { id: "b1", name: "Cafe Demo", slug: "cafe-demo" } });
    getDesign.mockResolvedValue({
      ok: true,
      value: { look: { color: "#6b3e26", ink: "#ffffff", logoUrl: "/api/card-images/b1/logo", coverUrl: null } },
    });
    await expect(loadLoginBusinessBrand("/b/cafe-demo")).resolves.toEqual({
      name: "Cafe Demo", color: "#6b3e26", ink: "#ffffff", logoUrl: "/api/card-images/b1/logo", purpose: "join",
    });
    expect(getBusiness).toHaveBeenCalledWith("cafe-demo");
  });

  it("falls back to the default card look when the business has no design", async () => {
    getBusiness.mockResolvedValue({ ok: true, value: { id: "b1", name: "Cafe Demo", slug: "cafe-demo" } });
    getDesign.mockResolvedValue({ ok: false, error: new Error("none") });
    const brand = await loadLoginBusinessBrand("/me/cards/cafe-demo");
    expect(brand).toMatchObject({ name: "Cafe Demo", logoUrl: null, purpose: "card" });
    expect(brand?.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("shows Cirix's screen for unknown or suspended businesses and on any failure", async () => {
    getBusiness.mockResolvedValue({ ok: false, error: new Error("not found") });
    await expect(loadLoginBusinessBrand("/b/nope")).resolves.toBeNull();

    getBusiness.mockRejectedValue(new Error("firestore down"));
    await expect(loadLoginBusinessBrand("/b/cafe-demo")).resolves.toBeNull();

    await expect(loadLoginBusinessBrand("/me")).resolves.toBeNull();
    expect(getBusiness).toHaveBeenCalledTimes(2);
  });
});
