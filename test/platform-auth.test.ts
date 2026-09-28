import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  verifyIdToken: vi.fn(), getUser: vi.fn(), createSessionCookie: vi.fn(), verifySessionCookie: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/infrastructure/firebase-admin", () => ({ adminAuth: () => auth }));
import { FirebaseIdentityProvider } from "@/core/iam/infrastructure/firebase/firebase-identity-provider";
import { CreateSession } from "@/core/iam/application/use-cases/create-session";
import { hasPlatformAccess } from "@/core/iam/infrastructure/firebase/platform-access";

const user = { uid: "approved-user", email: "user@example.com", emailVerified: true, disabled: false, customClaims: { platformAccess: true } };
const token = () => ({ uid: user.uid, email: user.email, email_verified: true, auth_time: Date.now() / 1000 });
const provider = new FirebaseIdentityProvider();

beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs(); vi.stubEnv("OPERATOR_EMAILS", "");
  auth.verifyIdToken.mockResolvedValue(token());
  auth.getUser.mockResolvedValue(user);
  auth.createSessionCookie.mockResolvedValue("valid-cookie");
  auth.verifySessionCookie.mockResolvedValue(token());
});

describe("administrative admission", () => {
  it.each(["google.com", "password"])("requires a verified token for both login providers: %s", async (signInProvider) => {
    const reviews = new FirebaseIdentityProvider("reviews");
    auth.getUser.mockResolvedValue({ ...user, customClaims: {} });
    auth.verifyIdToken.mockResolvedValue({ ...token(), firebase: { sign_in_provider: signInProvider }, email_verified: false });
    expect((await new CreateSession(reviews).execute({ idToken: "unverified" })).ok).toBe(false);
    expect(auth.createSessionCookie).not.toHaveBeenCalled();
    auth.verifyIdToken.mockResolvedValue({ ...token(), firebase: { sign_in_provider: signInProvider } });
    expect((await new CreateSession(reviews).execute({ idToken: "verified" })).ok).toBe(true);
    expect(await provider.verifySession("review-cookie")).toBeNull();
  });
  it("accepts a review identity without granting access to any platform module", async () => {
    const reviews = new FirebaseIdentityProvider("reviews");
    auth.getUser.mockResolvedValue({ ...user, customClaims: {} });
    expect((await new CreateSession(reviews).execute({ idToken: "token" })).ok).toBe(true);
    expect(await reviews.verifySession("valid-cookie")).not.toBeNull();
    expect(await provider.verifySession("valid-cookie")).toBeNull();
    expect((await new CreateSession(provider).execute({ idToken: "token" })).ok).toBe(false);
  });
  it.each([{ disabled: true }, { emailVerified: false }, { email: undefined }])(
    "rejects invalid review identities: %j", async (overrides) => {
      const reviews = new FirebaseIdentityProvider("reviews");
      auth.getUser.mockResolvedValue({ ...user, customClaims: {}, ...overrides });
      expect(await reviews.verifySession("cookie")).toBeNull();
      expect((await new CreateSession(reviews).execute({ idToken: "token" })).ok).toBe(false);
      expect(auth.createSessionCookie).not.toHaveBeenCalled();
    }
  );
  it("rejects a Google-created identity without prior authorization before minting a cookie", async () => {
    auth.getUser.mockResolvedValue({ ...user, customClaims: {} });
    const result = await new CreateSession(provider).execute({ idToken: "token" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("iam/access-denied");
    expect(auth.createSessionCookie).not.toHaveBeenCalled();
  });
  it("does not use OPERATOR_EMAILS as an admission bypass", async () => {
    vi.stubEnv("OPERATOR_EMAILS", user.email);
    auth.getUser.mockResolvedValue({ ...user, customClaims: {} });
    expect(await provider.verifySession("cookie")).toBeNull();
  });
  it("admits previously authorized users after recent authentication", async () => {
    const result = await new CreateSession(provider).execute({ idToken: "token" });
    expect(result.ok).toBe(true);
    expect(auth.verifyIdToken).toHaveBeenCalledWith("token", true);
    expect(auth.createSessionCookie).toHaveBeenCalledWith("token", { expiresIn: 14 * 86400000 });
  });
  it.each([
    { disabled: true }, { emailVerified: false }, { email: undefined },
    { customClaims: { platformAccess: "true" } },
    { customClaims: { platformAccess: false, operator: true } },
  ])("denies invalid or revoked admission: %j", async (overrides) => {
    auth.getUser.mockResolvedValue({ ...user, ...overrides });
    expect(await provider.verifySession("old-cookie")).toBeNull();
    expect((await new CreateSession(provider).execute({ idToken: "token" })).ok).toBe(false);
    expect(auth.createSessionCookie).not.toHaveBeenCalled();
  });
  it("keeps explicitly provisioned legacy operators and lets explicit revocation override their role", () => {
    expect(hasPlatformAccess({ ...user, customClaims: { operator: true } })).toBe(true);
    expect(hasPlatformAccess({ ...user, customClaims: { operator: true, platformAccess: false } })).toBe(false);
  });
  it("rejects expired authentication even for authorized users", async () => {
    auth.verifyIdToken.mockResolvedValue({ ...token(), auth_time: Date.now() / 1000 - 600 });
    expect((await new CreateSession(provider).execute({ idToken: "token" })).ok).toBe(false);
    expect(auth.createSessionCookie).not.toHaveBeenCalled();
  });
  it("rejects revoked ID tokens and never mints a cookie", async () => {
    auth.verifyIdToken.mockRejectedValue(new Error("revoked"));
    expect((await new CreateSession(provider).execute({ idToken: "token" })).ok).toBe(false);
    expect(auth.createSessionCookie).not.toHaveBeenCalled();
  });
  it("does not trust an old cookie's operator claim after demotion", async () => {
    auth.verifySessionCookie.mockResolvedValue({ ...token(), operator: true });
    const account = await provider.verifySession("old-operator-cookie");
    expect(account?.canOperateStore()).toBe(false);
    expect(account?.canPlaceOrders()).toBe(true);
    expect(auth.verifySessionCookie).toHaveBeenCalledWith("old-operator-cookie", true);
  });
  it("fails closed when the identity service is unavailable or the user is deleted", async () => {
    auth.getUser.mockRejectedValue(new Error("not found or unavailable"));
    expect(await provider.verifySession("cookie")).toBeNull();
  });
});
