import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "firebase/auth";

const sdk = vi.hoisted(() => ({
  isSignInWithEmailLink: vi.fn(), sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(), signOut: vi.fn(),
}));
vi.mock("firebase/auth", () => sdk);
import { completeEmailSignIn, emailSignInReturnUrl, rememberedSignInEmail, requestEmailSignIn } from "@/lib/firebase/email-sign-in";
import { safeInternalPath } from "@/lib/auth/return-path";

const fetchMock = vi.fn();
const getIdToken = vi.fn();
const storage = new Map<string, string>();
const link = "https://www.cirixadv.com/es/login?emailSignIn=1&mode=signIn&oobCode=one-time-code&apiKey=public";
const destination = "/es/make-a-review?source=whatsapp&ref=0123456789abcdef0123456789abcdef0123456789abcdef";
const options = { origin: "https://www.cirixadv.com", locale: "es" as const, redirectTo: destination };
let auth: Auth;

beforeEach(() => {
  vi.resetAllMocks();
  storage.clear();
  auth = {} as Auth;
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  sdk.sendSignInLinkToEmail.mockResolvedValue(undefined);
  sdk.isSignInWithEmailLink.mockReturnValue(true);
  sdk.signInWithEmailLink.mockResolvedValue({ user: { getIdToken } });
  sdk.signOut.mockResolvedValue(undefined);
  getIdToken.mockResolvedValue("verified-id-token");
  fetchMock.mockResolvedValue(Response.json({ ok: true, landing: "/make-a-review" }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("verified email sign-in", () => {
  it("sends a localized link retaining the review destination without including the address", async () => {
    expect(await requestEmailSignIn(auth, "  person@example.com  ", options)).toBe("person@example.com");
    expect(auth.languageCode).toBe("es");
    const [sentAuth, email, settings] = sdk.sendSignInLinkToEmail.mock.calls[0];
    expect(sentAuth).toBe(auth);
    expect(email).toBe("person@example.com");
    expect(settings.handleCodeInApp).toBe(true);
    const url = new URL(settings.url);
    expect(url.origin).toBe(options.origin);
    expect(url.pathname).toBe("/es/login");
    expect(url.searchParams.get("emailSignIn")).toBe("1");
    expect(url.searchParams.get("from")).toBe(destination);
    expect(url.href).not.toContain("person");
    expect(rememberedSignInEmail()).toBe("person@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it("supports English platform login and same-origin local development", () => {
    const url = new URL(emailSignInReturnUrl("http://localhost:3000", "en", "/en/admin"));
    expect(url.origin).toBe("http://localhost:3000");
    expect(url.pathname).toBe("/en/login");
    expect(url.searchParams.get("from")).toBe("/en/admin");
  });

  it.each(["", "not-an-email", "a@", `${"a".repeat(250)}@example.com`])("rejects invalid addresses before sending: %s", async (email) => {
    await expect(requestEmailSignIn(auth, email, options)).rejects.toMatchObject({ code: "auth/invalid-email" });
    expect(sdk.sendSignInLinkToEmail).not.toHaveBeenCalled();
  });

  it("does not claim a link was sent or remember an address when sending fails", async () => {
    sdk.sendSignInLinkToEmail.mockRejectedValue({ code: "auth/operation-not-allowed" });
    await expect(requestEmailSignIn(auth, "person@example.com", options)).rejects.toMatchObject({ code: "auth/operation-not-allowed" });
    expect(rememberedSignInEmail()).toBe("");
  });

  it("can send and complete sign-in with browser storage blocked", async () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("storage blocked"); } });
    await requestEmailSignIn(auth, "person@example.com", options);
    expect(rememberedSignInEmail()).toBe("");
    expect(await completeEmailSignIn(auth, "person@example.com", link, "reviews")).toBe("/make-a-review");
  });

  it("expires the saved address after 24 hours", async () => {
    vi.useFakeTimers();
    await requestEmailSignIn(auth, "person@example.com", options);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(rememberedSignInEmail()).toBe("");
    expect(storage.size).toBe(0);
  });

  it.each(["reviews", "platform"] as const)("requires Firebase verification before exchanging a %s session", async (audience) => {
    await requestEmailSignIn(auth, "person@example.com", options);
    await completeEmailSignIn(auth, "person@example.com", link, audience);
    expect(sdk.signInWithEmailLink).toHaveBeenCalledWith(auth, "person@example.com", link);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "verified-id-token", audience }),
    });
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
    expect(rememberedSignInEmail()).toBe("");
  });

  it("asks Firebase to verify a manually supplied address on a different device", async () => {
    expect(rememberedSignInEmail()).toBe("");
    await completeEmailSignIn(auth, "recipient@example.com", link, "reviews");
    expect(sdk.signInWithEmailLink).toHaveBeenCalledWith(auth, "recipient@example.com", link);
  });

  it("does not create a session from an arbitrary link or an address alone", async () => {
    sdk.isSignInWithEmailLink.mockReturnValue(false);
    await expect(completeEmailSignIn(auth, "person@example.com", "https://www.cirixadv.com/es/login", "reviews"))
      .rejects.toMatchObject({ code: "auth/invalid-action-code" });
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["auth/invalid-credential", "auth/expired-action-code", "auth/invalid-action-code"])(
    "does not create a session when Firebase rejects the address or link: %s", async (code) => {
      sdk.signInWithEmailLink.mockRejectedValue({ code });
      await expect(completeEmailSignIn(auth, "wrong@example.com", link, "reviews")).rejects.toEqual({ code });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("clears Firebase after a verified email is denied platform access", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "iam/access-denied" } }, { status: 403 }));
    await expect(completeEmailSignIn(auth, "person@example.com", link, "platform")).rejects.toMatchObject({ accessDenied: true });
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
  });
});

describe("login return destinations", () => {
  it.each([undefined, ["/admin"], "https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example", "/login", "/es/login?from=/admin", "/en/login/extra", "/es/../login"])(
    "rejects external, ambiguous, or looping destinations: %s", (value) => {
      expect(safeInternalPath(value)).toBeNull();
      if (typeof value === "string") {
        expect(new URL(emailSignInReturnUrl(options.origin, "es", value)).searchParams.has("from")).toBe(false);
      }
    },
  );
  it("retains campaign parameters and hashes for internal destinations", () => {
    expect(safeInternalPath(`${destination}#continue`)).toBe(`${destination}#continue`);
  });
});
