import "server-only";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import { sanitizeEvent, type PixelSite, type PixelSiteInput, type PixelEvent, type PixelEventInput } from "../domain/pixel";

const sites = () => adminFirestore().collection("pixel_sites");
export async function listSites(ownerId: string): Promise<PixelSite[]> {
  const snapshot = await sites().where("ownerId", "==", ownerId).limit(100).get();
  return snapshot.docs.map((doc) => doc.data() as PixelSite).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getSite(id: string): Promise<PixelSite | null> {
  const doc = await sites().doc(id).get();
  return doc.exists ? doc.data() as PixelSite : null;
}
export async function createSite(ownerId: string, input: PixelSiteInput): Promise<PixelSite> {
  const site = { ...input, ownerId, id: randomUUID(), createdAt: new Date().toISOString() };
  await sites().doc(site.id).create(site);
  return site;
}
export async function updateSite(id: string, ownerId: string, input: PixelSiteInput): Promise<boolean> {
  return adminFirestore().runTransaction(async (tx) => {
    const ref = sites().doc(id);
    const doc = await tx.get(ref);
    if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
    tx.update(ref, input);
    return true;
  });
}
export async function listEvents(siteId: string): Promise<PixelEvent[]> {
  const snapshot = await sites().doc(siteId).collection("pixel_events").orderBy("receivedAt", "desc").limit(100).get();
  const cutoff = Date.now() - 90 * 86400_000;
  return snapshot.docs.map((doc) => {
    const { expiresAt: _expiresAt, ...event } = doc.data();
    void _expiresAt;
    return event as PixelEvent;
  }).filter((event) => Date.parse(event.receivedAt) > cutoff);
}

/** Transaction gives idempotency and a shared per-site/minute write ceiling across instances. */
export async function recordEvent(input: PixelEventInput, origin: string): Promise<"created" | "duplicate" | "limited" | "forbidden"> {
  const db = adminFirestore();
  return db.runTransaction(async (tx) => {
    const siteRef = sites().doc(input.siteId);
    const site = (await tx.get(siteRef)).data() as PixelSite | undefined;
    if (!site?.active || site.origin !== origin) return "forbidden";
    const eventRef = siteRef.collection("pixel_events").doc(input.eventId);
    if ((await tx.get(eventRef)).exists) return "duplicate";
    const minute = Math.floor(Date.now() / 60_000);
    const rateRef = siteRef.collection("pixel_rate_limits").doc(String(minute));
    const count = (await tx.get(rateRef)).data()?.count ?? 0;
    if (count >= 300) return "limited";
    const now = Date.now();
    tx.set(rateRef, { count: count + 1, expiresAt: Timestamp.fromMillis(now + 86400_000) });
    tx.create(eventRef, { ...sanitizeEvent(input), receivedAt: new Date(now).toISOString(), expiresAt: Timestamp.fromMillis(now + 90 * 86400_000) });
    return "created";
  });
}
