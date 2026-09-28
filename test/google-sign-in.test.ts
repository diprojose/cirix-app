import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth, GoogleAuthProvider, UserCredential } from "firebase/auth";

const sdk = vi.hoisted(() => ({
  getRedirectResult: vi.fn(), signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(), signOut: vi.fn(),
}));
vi.mock("firebase/auth", () => sdk);
import { exchangeGoogleSession, prefersGoogleRedirect, resumeGoogleSignIn, SessionExchangeError, startGoogleSignIn } from "@/lib/firebase/google-sign-in";

const provider = { setCustomParameters: vi.fn() } as unknown as GoogleAuthProvider;
const getIdToken = vi.fn();
const credential = { user: { getIdToken } } as unknown as UserCredential;
const fetchMock = vi.fn();
const desktop = { prefersRedirect: false, origin: "https://www.cirixadv.com" };
const mobile = { ...desktop, prefersRedirect: true };
let auth: Auth;

beforeEach(() => {
  vi.resetAllMocks();
  auth = { config: { authDomain: "www.cirixadv.com" } } as Auth;
  vi.stubGlobal("fetch", fetchMock);
  getIdToken.mockResolvedValue("firebase-token");
  sdk.signOut.mockResolvedValue(undefined);
  sdk.signInWithPopup.mockResolvedValue(credential);
  sdk.getRedirectResult.mockResolvedValue(null);
});

describe("Google sign-in across browsers", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5, true],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", 5, true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15", 5, true],
    ["Mozilla/5.0 (Linux; Android 15)", 5, true],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0, false],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 10, false],
  ])("chooses the flow for %s", (userAgent, maxTouchPoints, expected) => {
    expect(prefersGoogleRedirect({ userAgent, maxTouchPoints })).toBe(expected);
  });

  it("opens the desktop popup before yielding the click handler", async () => {
    const result = startGoogleSignIn(auth, provider, desktop);
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(auth, provider);
    expect(await result).toBe(credential);
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("redirects mobile without opening a popup or signing out pending auth", async () => {
    expect(await startGoogleSignIn(auth, provider, mobile)).toBeNull();
    expect(sdk.signInWithRedirect).toHaveBeenCalledWith(auth, provider);
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
    expect(sdk.signOut).not.toHaveBeenCalled();
  });

  it("falls back to redirect only when a popup is blocked", async () => {
    sdk.signInWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });
    expect(await startGoogleSignIn(auth, provider, desktop)).toBeNull();
    expect(sdk.signInWithRedirect).toHaveBeenCalledOnce();
  });

  it("keeps the popup until the auth domain matches the page origin", async () => {
    const result = await startGoogleSignIn(auth, provider, { prefersRedirect: true, origin: "https://preview.example" });
    expect(result).toBe(credential);
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("does not send a blocked popup into a cross-origin redirect that loses its result", async () => {
    sdk.signInWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });
    await expect(startGoogleSignIn(auth, provider, { prefersRedirect: true, origin: "https://preview.example" }))
      .rejects.toEqual({ code: "auth/popup-blocked" });
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/network-request-failed"])(
    "does not force a redirect after %s", async (code) => {
      sdk.signInWithPopup.mockRejectedValue({ code });
      await expect(startGoogleSignIn(auth, provider, desktop)).rejects.toEqual({ code });
      expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["mixmag-6496a.firebaseapp.com", "https://www.cirixadv.com"],
    ["cirixadv.com", "https://www.cirixadv.com"],
    ["www.cirixadv.com", "https://preview.vercel.app"],
    ["mixmag-6496a.firebaseapp.com", "http://localhost:3000"],
    ["localhost:3000", "http://localhost:3000"],
  ])("uses a popup on mobile when authDomain %s differs from %s", async (authDomain, origin) => {
    auth = { config: { authDomain } } as Auth;
    const result = startGoogleSignIn(auth, provider, { prefersRedirect: true, origin });
    // Opening the popup must remain inside the original user activation.
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(auth, provider);
    expect(await result).toBe(credential);
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it.each([true, false])("reports a blocked popup without a broken cross-origin redirect (mobile: %s)", async (prefersRedirect) => {
    auth = { config: { authDomain: "mixmag-6496a.firebaseapp.com" } } as Auth;
    sdk.signInWithPopup.mockRejectedValue({ code: "auth/popup-blocked" });
    await expect(startGoogleSignIn(auth, provider, { ...desktop, prefersRedirect }))
      .rejects.toEqual({ code: "auth/popup-blocked" });
    expect(sdk.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("shares a consumed redirect result across Strict Mode subscriptions", async () => {
    sdk.getRedirectResult.mockResolvedValue(credential);
    const first = resumeGoogleSignIn(auth);
    const second = resumeGoogleSignIn(auth);
    expect(first).toBe(second);
    expect(await second).toBe(credential);
    expect(sdk.getRedirectResult).toHaveBeenCalledOnce();
  });

  it.each(["reviews", "platform"] as const)("exchanges the credential for a %s session and clears Firebase", async (audience) => {
    fetchMock.mockResolvedValue(Response.json({ landing: "/loyalty" }));
    expect(await exchangeGoogleSession(auth, credential, audience)).toBe("/loyalty");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "firebase-token", audience }),
    });
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
  });

  it("clears a completed redirect so a later login cannot reuse an old credential", async () => {
    sdk.getRedirectResult.mockResolvedValueOnce(credential).mockResolvedValue(null);
    fetchMock.mockResolvedValue(Response.json({ landing: "/" }));
    await resumeGoogleSignIn(auth);
    await exchangeGoogleSession(auth, credential, "reviews");
    expect(await resumeGoogleSignIn(auth)).toBeNull();
    expect(sdk.getRedirectResult).toHaveBeenCalledTimes(2);
  });

  it("clears Firebase even when server admission is denied", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "iam/access-denied" } }, { status: 403 }));
    await expect(exchangeGoogleSession(auth, credential, "platform")).rejects.toEqual(new SessionExchangeError(true));
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
  });

  it("clears Firebase when token retrieval fails", async () => {
    getIdToken.mockRejectedValue(new Error("network unavailable"));
    await expect(exchangeGoogleSession(auth, credential, "reviews")).rejects.toThrow("network unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sdk.signOut).toHaveBeenCalledWith(auth);
  });

  it.each(["https://external.example", "//external.example", "/\\external.example"])("rejects unsafe session landing %s", async (landing) => {
    fetchMock.mockResolvedValue(Response.json({ landing }));
    expect(await exchangeGoogleSession(auth, credential, "reviews")).toBe("/");
  });
});
