import type { GoogleReview, Invitation, ReviewVisit } from "./reviews";

export const percentage = (numerator: number, denominator: number) => denominator ? Math.round(numerator / denominator * 1000) / 10 : null;

/** Invitation cohorts use sentAt; repeat visits never increase counts. */
export function invitationMetrics(invitations: Invitation[], start: string, end: string, campaignId = "", source = "") {
  const cohort = invitations.filter((item) => item.sentAt && item.sentAt >= start && item.sentAt < end &&
    (!campaignId || item.campaignId === campaignId) && (!source || item.source === source));
  const progressed = (item: Invitation, field: "openedAt" | "clickedAt") => !!item[field] && item[field]! >= item.sentAt! && item[field]! < end;
  const opened = cohort.filter((item) => progressed(item, "openedAt")).length;
  const clicked = cohort.filter((item) => progressed(item, "clickedAt")).length;
  return { sent: cohort.length, opened, clicked, withoutOpen: cohort.length - opened, withoutClick: opened - clicked,
    openRate: percentage(opened, cohort.length), clickRate: percentage(clicked, cohort.length), continuationRate: percentage(clicked, opened) };
}
export function visitMetrics(visits: ReviewVisit[], start: string, end: string, campaignId = "", source = "") {
  const cohort = visits.filter((item) => item.openedAt >= start && item.openedAt < end &&
    (!campaignId || item.campaignId === campaignId) && (!source || item.source === source));
  const clicked = cohort.filter((item) => item.clickedAt && item.clickedAt < end).length;
  return { opened: cohort.length, clicked, rate: percentage(clicked, cohort.length) };
}
export function googleMetrics(reviews: GoogleReview[], start: string, end: string) {
  const previousStart = new Date(Date.parse(start) - (Date.parse(end) - Date.parse(start))).toISOString();
  const current = reviews.filter((item) => item.createdAt >= start && item.createdAt < end);
  const previous = reviews.filter((item) => item.createdAt >= previousStart && item.createdAt < start);
  return { count: current.length, previousCount: previous.length,
    growth: previous.length ? Math.round((current.length - previous.length) / previous.length * 1000) / 10 : null,
    unanswered: current.filter((item) => !item.reply).length,
    distribution: [1, 2, 3, 4, 5].map((rating) => current.filter((item) => item.rating === rating).length) };
}
