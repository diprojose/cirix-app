import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/%5F%5F/auth/[...path]/route";

const fetchMock = vi.fn();
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("<html>Firebase helper</html>", { headers: {
    "Content-Type": "text/html", "Cache-Control": "max-age=1800", "X-Frame-Options": "DENY",
    "Content-Encoding": "gzip", "Content-Length": "123", "Set-Cookie": "upstream=value",
  } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("same-origin Firebase auth proxy", () => {
  it("preserves OAuth query parameters and overrides upstream framing/cache headers", async () => {
    const response = await GET(new Request("https://cirixadv.com/__/auth/iframe?apiKey=public&eventId=abc"), context("iframe"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("content-type")).toBe("text/html");
    for (const header of ["content-encoding", "content-length", "set-cookie"]) expect(response.headers.has(header)).toBe(false);
    expect(await response.text()).toBe("<html>Firebase helper</html>");
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://test-project.firebaseapp.com/__/auth/iframe?apiKey=public&eventId=abc");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store", redirect: "manual" });
  });

  it("forwards POST callbacks without leaking app cookies or authorization", async () => {
    const response = await POST(new Request("https://cirixadv.com/__/auth/handler", {
      method: "POST", body: "state=abc&code=oauth-code",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: "session=private", authorization: "Bearer private" },
    }), context("handler"));
    expect(response.status).toBe(200);
    const options = fetchMock.mock.calls[0][1];
    expect(options.method).toBe("POST");
    expect(new TextDecoder().decode(options.body)).toBe("state=abc&code=oauth-code");
    expect(options.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    expect(options.headers.has("cookie")).toBe(false);
    expect(options.headers.has("authorization")).toBe(false);
  });

  it.each(["unknown", "handler/extra", "../admin"])("does not proxy arbitrary paths: %s", async (path) => {
    expect((await GET(new Request("https://cirixadv.com/__/auth/unknown"), context(path))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails without a configured Firebase project", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    expect((await GET(new Request("https://cirixadv.com/__/auth/iframe"), context("iframe"))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not cache upstream failures", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const response = await GET(new Request("https://cirixadv.com/__/auth/iframe"), context("iframe"));
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
