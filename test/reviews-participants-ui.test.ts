import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewParticipants } from "@/modules/reviews/ui/review-participants";
import type { ReviewParticipant } from "@/modules/reviews/domain/reviews";

const openedAt = "2026-09-26T13:16:45.649Z";
const person: ReviewParticipant = { id: "one", uid: "uid-one", name: "First Customer", email: "first@example.com",
  campaignId: "campaign", source: "qr", openedAt, clickedAt: null, lastSeenAt: openedAt };
const props = { campaigns: [{ id: "campaign", token: "a".repeat(48), name: "Customers", createdAt: openedAt }],
  start: "2026-09-01T00:00:00.000Z", end: "2026-10-01T00:00:00.000Z", campaignId: "", source: "", locale: "en" as const };
describe("review user status table", () => {
  it("shows the identity and correct state for both stages without claiming publication", () => {
    const html = renderToStaticMarkup(createElement(ReviewParticipants, { ...props, participants: [person,
      { ...person, id: "two", uid: "uid-two", name: null, email: "second@example.com", clickedAt: openedAt }] }));
    const body = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    const [first, second] = body.split("</tr>");
    expect(first).toContain("First Customer"); expect(first).toContain("first@example.com");
    expect(first).toContain("Page session · no recorded click");
    expect(second).toContain("second@example.com"); expect(second).toContain("Page session with a Google click");
    expect(body).toContain("Customers"); expect(body).toContain("QR");
    expect(html).toContain("A click does not confirm a published review.");
  });
  it("shows an explicit empty state for historical anonymous-only data", () => {
    const html = renderToStaticMarkup(createElement(ReviewParticipants, { ...props, participants: [] }));
    expect(html).toContain("No users with linked activity match these filters.");
    expect(html).toContain("Visits recorded before account linking remain anonymous.");
  });
});
