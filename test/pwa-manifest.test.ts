import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { isMemberPage, requiresPlatformAccess } from "@/lib/auth/route-access";

describe("customer app manifest", () => {
  it("opens the customer's own area, which any verified account may reach", () => {
    const { start_url: startUrl } = manifest();
    expect(startUrl).toBe("/me");
    expect(isMemberPage(startUrl as string)).toBe(true);
    expect(requiresPlatformAccess(startUrl as string)).toBe(false);
  });

  it("covers both languages and the login, so sign-in stays inside the app", () => {
    expect(manifest().scope).toBe("/");
  });

  it("does not describe the legacy store", () => {
    expect(JSON.stringify(manifest())).not.toMatch(/loyalty|grocery|supermercado|delivery/i);
  });
});

describe("privacy page access", () => {
  it("is open to anyone, and only at its exact address", () => {
    expect(requiresPlatformAccess("/privacy")).toBe(false);
    expect(requiresPlatformAccess("/privacy/other")).toBe(true);
  });
});
