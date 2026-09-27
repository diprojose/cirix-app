import "server-only";
import { createHash, createHmac } from "node:crypto";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";

export type ReplyRoute = {
  from: string;
  to: string[];
  messageId: string;
  expiresAt: number;
};
const collection = "mailReplyRoutes";
const documentId = (token: string) => createHash("sha256").update(token).digest("hex");

export async function saveReplyRoute(emailId: string, route: Omit<ReplyRoute, "expiresAt">, secret: string) {
  // Stable across webhook retries; neither token nor mail body is stored in Firestore.
  const token = createHmac("sha256", secret).update(`cirix-reply/${emailId}`).digest("hex").slice(0,48);
  const ref = adminFirestore().collection(collection).doc(documentId(token));
  await adminFirestore().runTransaction(async (tx) => {
    if (!(await tx.get(ref)).exists) tx.create(ref, { ...route, expiresAt: Date.now() + 90 * 86400000 });
  });
  return `reply+${token}@cirixad.com`;
}

export async function findReplyRoute(address: string): Promise<ReplyRoute | null> {
  const token = /^reply\+([a-f0-9]{48})@cirixad\.com$/i.exec(address)?.[1]?.toLowerCase();
  if (!token) return null;
  const snapshot = await adminFirestore().collection(collection).doc(documentId(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as ReplyRoute;
  if (data.expiresAt < Date.now()) return null;
  return data;
}
