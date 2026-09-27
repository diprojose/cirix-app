import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { Campaign, Invitation, ReviewVisit, ReviewIdentity, ReviewParticipant, TrackingInput, invitationInput } from "../domain/reviews";
import type { z } from "zod";

const token = () => randomBytes(24).toString("hex");
const retention = 180 * 86400_000;
const since = () => new Date(Date.now() - retention).toISOString();
const collection = (name: string) => adminFirestore().collection(`review_${name}`);

export async function listReviewData() {
  const windowStart = since();
  const snapshots = await Promise.all([
    collection("campaigns").orderBy("createdAt", "desc").limit(501).get(),
    collection("invitations").where("reportAt", ">=", windowStart).limit(5001).get(),
    collection("visits").where("openedAt", ">=", windowStart).limit(5001).get(),
    collection("participants").where("lastSeenAt", ">=", windowStart).limit(5001).get(),
  ]);
  // Never silently compute effectiveness from a truncated sample.
  if (snapshots[0].size > 500 || snapshots.slice(1).some((snapshot) => snapshot.size > 5000)) throw new Error("review/report-capacity");
  return {
    campaigns: snapshots[0].docs.map((doc) => doc.data() as Campaign),
    invitations: snapshots[1].docs.map((doc) => {
      const { expiresAt: _expiresAt, reportAt: _reportAt, ...data } = doc.data(); void _expiresAt; void _reportAt; return data as Invitation;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    visits: snapshots[2].docs.map((doc) => {
      const { expiresAt: _expiresAt, ...data } = doc.data(); void _expiresAt; return data as ReviewVisit;
    }),
    participants: snapshots[3].docs.map((doc) => {
      const { expiresAt: _expiresAt, ...data } = doc.data(); void _expiresAt; return data as ReviewParticipant;
    }).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)), windowStart,
  };
}
export async function createCampaign(name: string): Promise<Campaign> {
  const campaign: Campaign = { id: randomUUID(), token: token(), name, createdAt: new Date().toISOString() };
  const batch = adminFirestore().batch();
  batch.create(collection("campaigns").doc(campaign.id), campaign);
  batch.create(collection("links").doc(campaign.token), { campaignId: campaign.id, invitationId: null });
  await batch.commit(); return campaign;
}
export async function createInvitation(input: z.infer<typeof invitationInput>): Promise<Invitation> {
  if (!(await collection("campaigns").doc(input.campaignId).get()).exists) throw new Error("review/campaign-not-found");
  const invitation: Invitation = { ...input, id: randomUUID(), token: token(), createdAt: new Date().toISOString(), sentAt: null, openedAt: null, clickedAt: null };
  const expiresAt = Timestamp.fromMillis(Date.now() + retention);
  const batch = adminFirestore().batch();
  batch.create(collection("invitations").doc(invitation.id), { ...invitation, reportAt: invitation.createdAt, expiresAt });
  batch.create(collection("links").doc(invitation.token), { invitationId: invitation.id, campaignId: invitation.campaignId, expiresAt });
  await batch.commit(); return invitation;
}
export async function markInvitationSent(id: string): Promise<boolean> {
  return adminFirestore().runTransaction(async (tx) => {
    const ref = collection("invitations").doc(id);
    const data = (await tx.get(ref)).data() as Invitation | undefined;
    if (!data || (data.sentAt ?? data.createdAt) < since()) return false;
    if (!data.sentAt) {
      const sentAt = new Date().toISOString();
      const expiresAt = Timestamp.fromMillis(Date.now() + retention);
      tx.update(ref, { sentAt, reportAt: sentAt, expiresAt });
      tx.update(collection("links").doc(data.token), { expiresAt });
    }
    return true;
  });
}
/** Identity is supplied only by the verified server session, never the event payload. */
export async function recordReviewEvent(input: TrackingInput, identity: ReviewIdentity): Promise<"recorded" | "ignored" | "limited"> {
  const now = Date.now(); const date = new Date(now).toISOString();
  return adminFirestore().runTransaction(async (tx) => {
    const rateRef = collection("rate_limits").doc(String(Math.floor(now / 60_000)));
    const rate = (await tx.get(rateRef)).data()?.count ?? 0;
    if (rate >= 300) return "limited";
    let campaignId: string | null = null; let invitationId: string | null = null;
    if (input.token) {
      const link = (await tx.get(collection("links").doc(input.token))).data();
      if (!link || (link.expiresAt && link.expiresAt.toMillis() <= now)) return "ignored";
      campaignId = link.campaignId; invitationId = link.invitationId;
    }
    const participantId = createHash("sha256").update(JSON.stringify([identity.uid, campaignId, input.source])).digest("hex");
    const participantRef = collection("participants").doc(participantId);
    const storedParticipant = (await tx.get(participantRef)).data() as ReviewParticipant | undefined;
    const participant = storedParticipant && storedParticipant.lastSeenAt >= since() ? storedParticipant : undefined;
    if (invitationId) {
      const ref = collection("invitations").doc(invitationId);
      const data = (await tx.get(ref)).data() as Invitation | undefined;
      if (!data?.sentAt || data.sentAt < since()) return "ignored";
      tx.update(ref, { openedAt: data.openedAt ?? date,
        clickedAt: input.event === "review_google_clicked" ? data.clickedAt ?? date : data.clickedAt });
    } else {
      const id = createHash("sha256").update(JSON.stringify([input.token ?? "direct", input.source, input.visitId, identity.uid])).digest("hex");
      const ref = collection("visits").doc(id);
      const existing = (await tx.get(ref)).data() as ReviewVisit | undefined;
      tx.set(ref, { id, campaignId, source: input.source, openedAt: existing?.openedAt ?? date,
        clickedAt: input.event === "review_google_clicked" ? existing?.clickedAt ?? date : existing?.clickedAt ?? null,
        expiresAt: Timestamp.fromMillis(now + retention) });
    }
    tx.set(participantRef, { id: participantId, ...identity, campaignId, source: input.source,
      openedAt: participant?.openedAt ?? date,
      clickedAt: input.event === "review_google_clicked" ? participant?.clickedAt ?? date : participant?.clickedAt ?? null,
      lastSeenAt: date, expiresAt: Timestamp.fromMillis(now + retention) });
    tx.set(rateRef, { count: rate + 1, expiresAt: Timestamp.fromMillis(now + 86400_000) });
    return "recorded";
  });
}
