import { describe, expect, it } from "vitest";
import { filterParticipants } from "@/modules/reviews/domain/metrics";
import type { ReviewParticipant } from "@/modules/reviews/domain/reviews";

const start = "2026-09-01T00:00:00.000Z", end = "2026-10-01T00:00:00.000Z";
const person: ReviewParticipant = { id: "a", uid: "user-a", email: "customer@example.com", name: "Customer",
  campaignId: "campaign", source: "qr", openedAt: "2026-08-01T00:00:00.000Z", clickedAt: null, lastSeenAt: start };
describe("review participant report", () => {
  it("uses recent activity and preserves earlier known progress", () => {
    const clicked = { ...person, clickedAt: "2026-08-02T00:00:00.000Z" };
    expect(filterParticipants([clicked], start, end, "campaign", "qr", "CUSTOMER@", "clicked")).toEqual([clicked]);
    expect(filterParticipants([clicked], start, end, "", "", "", "opened")).toEqual([]);
  });
  it("filters campaigns, channels, users and dates without mixing people", () => {
    const rows = [person, { ...person, id: "b", lastSeenAt: end }];
    expect(filterParticipants(rows, start, end)).toEqual([person]);
    expect(filterParticipants(rows, start, end, "other")).toEqual([]);
    expect(filterParticipants(rows, start, end, "", "email")).toEqual([]);
    expect(filterParticipants(rows, start, end, "", "", "another@example.com")).toEqual([]);
    expect(filterParticipants(rows, start, end, "", "", "customer", "opened")).toEqual([person]);
  });
});
