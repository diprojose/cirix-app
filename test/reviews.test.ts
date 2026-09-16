import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { continueToGoogle } from "@/modules/reviews/lib/continue-to-google";
import { GOOGLE_REVIEW_URL, reviewSource } from "@/modules/reviews/lib/constants";
import { REVIEW_EVENTS, trackReviewEvent } from "@/modules/reviews/lib/analytics";

vi.mock("server-only", () => ({}));
import { POST } from "@/app/api/reviews/events/route";

const assign = vi.fn();
const writeText = vi.fn();
const fetchEvent = vi.fn();
beforeEach(() => {
  vi.stubGlobal("window", { location: { assign } });
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  vi.stubGlobal("fetch", fetchEvent);
  assign.mockReset(); writeText.mockReset(); fetchEvent.mockReset();
  writeText.mockResolvedValue(undefined); fetchEvent.mockResolvedValue({ ok: true });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Google handoff", () => {
  it("copies the trimmed comment and navigates to the central destination", async () => {
    await continueToGoogle("  Una experiencia de prueba.  ");
    expect(writeText).toHaveBeenCalledWith("Una experiencia de prueba.");
    expect(assign).toHaveBeenCalledExactlyOnceWith(GOOGLE_REVIEW_URL);
  });
  it("continues without a comment or rating", async () => {
    await continueToGoogle(" \n ");
    expect(writeText).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(GOOGLE_REVIEW_URL);
  });
  it("continues when clipboard is denied", async () => {
    writeText.mockRejectedValue(new Error("Denied"));
    await continueToGoogle("Test");
    expect(assign).toHaveBeenCalledWith(GOOGLE_REVIEW_URL);
  });
  it("continues when clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await continueToGoogle("Test");
    expect(assign).toHaveBeenCalledWith(GOOGLE_REVIEW_URL);
  });
  it("bounds a permission prompt that never settles", async () => {
    vi.useFakeTimers();
    writeText.mockReturnValue(new Promise(() => {}));
    const continuing = continueToGoogle("Test");
    await vi.advanceTimersByTimeAsync(1200);
    await continuing;
    expect(assign).toHaveBeenCalledExactlyOnceWith(GOOGLE_REVIEW_URL);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("review analytics", () => {
  it.each([1, 2, 3, 4, 5, null])("tracks the same CTA for rating %s without leaking comment text", (rating) => {
    const properties = { rating, hasComment: true, source: "qr" as const, comment: "Private text" };
    trackReviewEvent("review_google_clicked", properties);
    expect(fetchEvent).toHaveBeenCalledWith("/api/reviews/events", expect.objectContaining({
      keepalive: true, credentials: "omit", referrerPolicy: "no-referrer",
      body: JSON.stringify({ event: "review_google_clicked", source: "qr", rating, hasComment: true }),
    }));
  });
  it("does not await an analytics request", () => {
    fetchEvent.mockReturnValue(new Promise(() => {}));
    expect(trackReviewEvent("review_page_view", { source: "direct" })).toBeUndefined();
  });
  it("absorbs synchronous and asynchronous transport errors", async () => {
    fetchEvent.mockImplementationOnce(() => { throw new Error("Offline"); });
    expect(() => trackReviewEvent("review_page_view", { source: "direct" })).not.toThrow();
    fetchEvent.mockRejectedValueOnce(new Error("Offline"));
    trackReviewEvent("review_page_view", { source: "direct" });
    await Promise.resolve();
  });
  it.each([{ doNotTrack: "1" }, { globalPrivacyControl: true }])("respects privacy signals %j", (navigator) => {
    vi.stubGlobal("navigator", navigator);
    trackReviewEvent("review_page_view", { source: "direct" });
    expect(fetchEvent).not.toHaveBeenCalled();
  });
  it.each(["qr", "whatsapp", "email", "sms", "direct"])("preserves source %s", (source) => {
    expect(reviewSource(source)).toBe(source);
  });
  it("normalizes missing, repeated and arbitrary attribution", () => {
    expect(reviewSource(undefined)).toBe("direct");
    expect(reviewSource(["email", "qr"])).toBe("email");
    expect(reviewSource("private@example.com")).toBe("direct");
  });
});

const payload = { event: "review_google_clicked", source: "qr", rating: 1, hasComment: true };
function request(body: unknown = payload, origin = "https://cirix.example") {
  return new Request("https://cirix.example/api/reviews/events", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
describe("public review event boundary", () => {
  it.each(REVIEW_EVENTS)("records %s as structured internal telemetry", async (event) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await POST(request({ ...payload, event }));
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(log).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ module: "reviews", ...payload, event }));
  });
  it.each([
    { ...payload, comment: "Private text" }, { ...payload, email: "private@example.com" },
    { ...payload, rating: 0 }, { ...payload, rating: 6 }, { ...payload, rating: 1.5 },
    { ...payload, event: "review_published" }, { ...payload, source: "untrusted" },
  ])("rejects unsupported fields or values without logging them", async (body) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect((await POST(request(body))).status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and oversized requests", async () => {
    expect((await POST(request(payload, "https://evil.example"))).status).toBe(403);
    expect((await POST(request({ ...payload, comment: "x".repeat(9000) }))).status).toBe(413);
  });
  it("does not log when the browser sends a privacy signal", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const input = request(); input.headers.set("sec-gpc", "1");
    expect((await POST(input)).status).toBe(204);
    expect(log).not.toHaveBeenCalled();
  });
});
